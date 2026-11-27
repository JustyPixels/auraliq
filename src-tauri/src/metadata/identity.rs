use std::collections::{BTreeSet, HashMap};

use crate::database::models::{DuplicateGroup, SmartPlaylistRule, TrackIdentityLink, TrackRecord};

const VERSION_QUALIFIERS: &[&str] = &[
    "live",
    "remix",
    "acoustic",
    "cover",
    "instrumental",
    "radio edit",
    "explicit",
    "clean",
    "demo",
];

const DURATION_TOLERANCE_MS: i64 = 4_000;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TrackFingerprint {
    pub normalized_title: String,
    pub normalized_artist: String,
    pub version_tags: Vec<String>,
    pub canonical_key: String,
}

fn clean_tokens(raw: &str) -> String {
    raw.to_ascii_lowercase()
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c.is_whitespace() {
                c
            } else {
                ' '
            }
        })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

pub fn fingerprint_track(title: &str, artist: &str) -> TrackFingerprint {
    let lower_title = title.to_ascii_lowercase();
    let mut tags = BTreeSet::new();

    for qualifier in VERSION_QUALIFIERS {
        if lower_title.contains(qualifier) {
            tags.insert((*qualifier).to_string());
        }
    }

    let mut cleaned = clean_tokens(&lower_title);
    for noise in [
        "remastered",
        "remaster",
        "feat",
        "ft",
        "explicit",
        "clean",
        "live",
        "remix",
        "acoustic",
        "cover",
        "instrumental",
        "radio edit",
        "demo",
    ] {
        cleaned = cleaned
            .split_whitespace()
            .filter(|w| *w != noise)
            .collect::<Vec<_>>()
            .join(" ");
    }

    let norm_title = if cleaned.is_empty() {
        clean_tokens(&lower_title)
    } else {
        cleaned
    };
    let norm_artist = clean_tokens(artist);
    let version_tags: Vec<String> = tags.into_iter().collect();
    let tag_suffix = if version_tags.is_empty() {
        "studio".to_string()
    } else {
        version_tags.join("+")
    };

    let canonical_key = format!("{norm_artist}::{norm_title}::{tag_suffix}");

    TrackFingerprint {
        normalized_title: norm_title,
        normalized_artist: norm_artist,
        version_tags,
        canonical_key,
    }
}

pub fn tracks_are_compatible(a: &TrackRecord, b: &TrackRecord) -> bool {
    let fp_a = fingerprint_track(&a.title, &a.artist);
    let fp_b = fingerprint_track(&b.title, &b.artist);

    if fp_a.canonical_key != fp_b.canonical_key {
        return false;
    }

    if a.duration_ms > 0
        && b.duration_ms > 0
        && (a.duration_ms - b.duration_ms).abs() > DURATION_TOLERANCE_MS
    {
        return false;
    }

    true
}

pub fn find_duplicate_groups(tracks: &[TrackRecord]) -> Vec<DuplicateGroup> {
    let mut buckets: HashMap<String, Vec<TrackRecord>> = HashMap::new();
    for track in tracks {
        let fp = fingerprint_track(&track.title, &track.artist);
        buckets
            .entry(fp.canonical_key)
            .or_default()
            .push(track.clone());
    }

    let mut groups = Vec::new();
    for (key, group_tracks) in buckets {
        if group_tracks.len() < 2 {
            continue;
        }
        let anchor = group_tracks[0].clone();
        let compatible: Vec<TrackRecord> = group_tracks
            .into_iter()
            .filter(|t| tracks_are_compatible(&anchor, t))
            .collect();
        if compatible.len() >= 2 {
            groups.push(DuplicateGroup {
                canonical_key: key,
                display_title: anchor.title.clone(),
                display_artist: anchor.artist.clone(),
                tracks: compatible,
            });
        }
    }

    groups.sort_by(|a, b| a.display_title.cmp(&b.display_title));
    groups
}

pub fn suggest_identity_links(
    tracks: &[TrackRecord],
    statuses: &HashMap<(i64, i64), String>,
) -> Vec<TrackIdentityLink> {
    let mut buckets: HashMap<String, Vec<&TrackRecord>> = HashMap::new();
    for track in tracks {
        let fp = fingerprint_track(&track.title, &track.artist);
        buckets.entry(fp.canonical_key).or_default().push(track);
    }

    let mut links = Vec::new();
    for group in buckets.values() {
        if group.len() < 2 {
            continue;
        }
        for i in 0..group.len() {
            for j in (i + 1)..group.len() {
                let a = group[i];
                let b = group[j];
                if !tracks_are_compatible(a, b) {
                    continue;
                }
                let (id_a, id_b) = if a.id < b.id {
                    (a.id, b.id)
                } else {
                    (b.id, a.id)
                };
                let status = statuses
                    .get(&(id_a, id_b))
                    .cloned()
                    .unwrap_or_else(|| "suggested".to_string());
                let confidence = if a.album.eq_ignore_ascii_case(&b.album) {
                    0.96
                } else {
                    0.88
                };
                let match_reason = format!(
                    "Normalized title & artist match within {}s duration tolerance",
                    DURATION_TOLERANCE_MS / 1000
                );
                links.push(TrackIdentityLink {
                    track_a_id: id_a,
                    track_b_id: id_b,
                    track_a_title: a.title.clone(),
                    track_a_source: a.source_provider.clone(),
                    track_b_title: b.title.clone(),
                    track_b_source: b.source_provider.clone(),
                    confidence,
                    match_reason,
                    status,
                });
            }
        }
    }
    links
}

fn rule_matches(track: &TrackRecord, rule: &SmartPlaylistRule) -> bool {
    let val = rule.value.trim();
    let val_lower = val.to_ascii_lowercase();

    match rule.field.as_str() {
        "genre" => match rule.operator.as_str() {
            "equals" => track.genre.to_ascii_lowercase() == val_lower,
            _ => track.genre.to_ascii_lowercase().contains(&val_lower),
        },
        "artist" => match rule.operator.as_str() {
            "equals" => track.artist.to_ascii_lowercase() == val_lower,
            _ => track.artist.to_ascii_lowercase().contains(&val_lower),
        },
        "album" => match rule.operator.as_str() {
            "equals" => track.album.to_ascii_lowercase() == val_lower,
            _ => track.album.to_ascii_lowercase().contains(&val_lower),
        },
        "source" => track.source_provider.to_ascii_lowercase() == val_lower,
        "favorite" => match rule.operator.as_str() {
            "is_false" => !track.is_favorite,
            _ => track.is_favorite,
        },
        "play_count" => {
            let target = val.parse::<i64>().unwrap_or(0);
            match rule.operator.as_str() {
                "lte" => track.play_count <= target,
                "equals" => track.play_count == target,
                _ => track.play_count >= target,
            }
        }
        "duration_sec" => {
            let target = val.parse::<i64>().unwrap_or(0);
            let secs = track.duration_ms / 1000;
            match rule.operator.as_str() {
                "lte" => secs <= target,
                "equals" => secs == target,
                _ => secs >= target,
            }
        }
        "release_year" => {
            let Some(year) = track.release_year else {
                return false;
            };
            let target = val.parse::<i64>().unwrap_or(0);
            match rule.operator.as_str() {
                "lte" => year <= target,
                "equals" => year == target,
                _ => year >= target,
            }
        }
        _ => false,
    }
}

pub fn evaluate_smart_playlist(
    tracks: &[TrackRecord],
    rules: &[SmartPlaylistRule],
    match_mode: &str,
) -> Vec<TrackRecord> {
    if rules.is_empty() {
        return tracks.to_vec();
    }

    tracks
        .iter()
        .filter(|track| {
            if match_mode == "any" {
                rules.iter().any(|r| rule_matches(track, r))
            } else {
                rules.iter().all(|r| rule_matches(track, r))
            }
        })
        .cloned()
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn track(id: i64, title: &str, artist: &str, duration_ms: i64, genre: &str) -> TrackRecord {
        TrackRecord {
            id,
            source_provider: "local".into(),
            file_path: format!("E:\\Music\\{id}.flac"),
            title: title.into(),
            artist: artist.into(),
            album: "Signals".into(),
            album_artist: artist.into(),
            genre: genre.into(),
            duration_ms,
            track_number: Some(id),
            disc_number: Some(1),
            release_year: Some(2025),
            format: "flac".into(),
            bitrate_kbps: Some(900),
            sample_rate_hz: Some(44100),
            artwork_path: None,
            file_size: 1000,
            modified_at: 1,
            is_missing: false,
            play_count: if id == 1 { 5 } else { 0 },
            last_played_at: None,
            is_favorite: id == 1,
            added_at: 1,
        }
    }

    #[test]
    fn never_merges_live_remix_or_explicit_with_studio() {
        let studio = track(1, "Midnight Drive (Remastered)", "Neon", 200_000, "Synth");
        let live = track(2, "Midnight Drive (Live)", "Neon", 200_000, "Synth");
        let remix = track(3, "Midnight Drive (Club Remix)", "Neon", 200_000, "Synth");
        let explicit = track(4, "Midnight Drive (Explicit)", "Neon", 200_000, "Synth");
        let dup_studio = track(5, "Midnight Drive", "Neon", 201_000, "Synth");

        assert!(!tracks_are_compatible(&studio, &live));
        assert!(!tracks_are_compatible(&studio, &remix));
        assert!(!tracks_are_compatible(&studio, &explicit));
        assert!(tracks_are_compatible(&studio, &dup_studio));

        let groups = find_duplicate_groups(&[studio, live, remix, explicit, dup_studio]);
        assert_eq!(groups.len(), 1);
        assert_eq!(groups[0].tracks.len(), 2);
    }

    #[test]
    fn rejects_tracks_outside_duration_tolerance() {
        let a = track(1, "Pulse", "Auraliq", 180_000, "Electronic");
        let b = track(2, "Pulse", "Auraliq", 210_000, "Electronic");
        assert!(!tracks_are_compatible(&a, &b));
    }

    #[test]
    fn evaluates_smart_playlist_all_and_any_rules() {
        let t1 = track(1, "Alpha", "Artist A", 180_000, "Synthwave");
        let t2 = track(2, "Beta", "Artist B", 240_000, "Ambient");

        let all_rules = vec![
            SmartPlaylistRule {
                field: "genre".into(),
                operator: "contains".into(),
                value: "Synth".into(),
            },
            SmartPlaylistRule {
                field: "favorite".into(),
                operator: "is_true".into(),
                value: "".into(),
            },
        ];
        let matched_all = evaluate_smart_playlist(&[t1.clone(), t2.clone()], &all_rules, "all");
        assert_eq!(matched_all.len(), 1);
        assert_eq!(matched_all[0].id, 1);

        let any_rules = vec![
            SmartPlaylistRule {
                field: "genre".into(),
                operator: "equals".into(),
                value: "Ambient".into(),
            },
            SmartPlaylistRule {
                field: "play_count".into(),
                operator: "gte".into(),
                value: "3".into(),
            },
        ];
        let matched_any = evaluate_smart_playlist(&[t1, t2], &any_rules, "any");
        assert_eq!(matched_any.len(), 2);
    }
}
