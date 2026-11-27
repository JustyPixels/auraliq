use std::path::{Path, PathBuf};

use crate::database::models::TrackRecord;

pub fn parse_m3u(content: &str, base_dir: &Path) -> Vec<PathBuf> {
    content
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty() && !line.starts_with('#'))
        .map(|line| {
            let p = PathBuf::from(line);
            if p.is_absolute() {
                p
            } else {
                base_dir.join(p)
            }
        })
        .collect()
}

pub fn parse_pls(content: &str, base_dir: &Path) -> Vec<PathBuf> {
    content
        .lines()
        .map(str::trim)
        .filter_map(|line| {
            let (key, val) = line.split_once('=')?;
            if key.trim().to_ascii_lowercase().starts_with("file") {
                let raw = val.trim();
                if raw.is_empty() {
                    return None;
                }
                let p = PathBuf::from(raw);
                Some(if p.is_absolute() { p } else { base_dir.join(p) })
            } else {
                None
            }
        })
        .collect()
}

pub fn export_m3u8(tracks: &[TrackRecord]) -> String {
    let mut out = String::from("#EXTM3U\n");
    for track in tracks {
        let secs = (track.duration_ms / 1000).max(0);
        out.push_str(&format!(
            "#EXTINF:{},{} - {}\n{}\n",
            secs, track.artist, track.title, track.file_path
        ));
    }
    out
}

pub fn export_pls(tracks: &[TrackRecord]) -> String {
    let mut out = String::from("[playlist]\n");
    for (idx, track) in tracks.iter().enumerate() {
        let n = idx + 1;
        let secs = (track.duration_ms / 1000).max(0);
        out.push_str(&format!("File{n}={}\n", track.file_path));
        out.push_str(&format!("Title{n}={} - {}\n", track.artist, track.title));
        out.push_str(&format!("Length{n}={secs}\n"));
    }
    out.push_str(&format!("NumberOfEntries={}\nVersion=2\n", tracks.len()));
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn dummy_track(path: &str) -> TrackRecord {
        TrackRecord {
            id: 1,
            source_provider: "local".into(),
            file_path: path.into(),
            title: "Signal".into(),
            artist: "Auraliq".into(),
            album: "Test".into(),
            album_artist: "Auraliq".into(),
            genre: "Synth".into(),
            duration_ms: 125_000,
            track_number: Some(1),
            disc_number: Some(1),
            release_year: Some(2026),
            format: "flac".into(),
            bitrate_kbps: None,
            sample_rate_hz: Some(44100),
            artwork_path: None,
            file_size: 100,
            modified_at: 1,
            is_missing: false,
            play_count: 0,
            last_played_at: None,
            is_favorite: false,
            added_at: 1,
        }
    }

    #[test]
    fn roundtrips_m3u8_and_pls() {
        let tracks = vec![dummy_track("E:\\Music\\signal.flac")];
        let m3u = export_m3u8(&tracks);
        let parsed_m3u = parse_m3u(&m3u, Path::new("E:\\Music"));
        assert_eq!(parsed_m3u, vec![PathBuf::from("E:\\Music\\signal.flac")]);

        let pls = export_pls(&tracks);
        let parsed_pls = parse_pls(&pls, Path::new("E:\\Music"));
        assert_eq!(parsed_pls, vec![PathBuf::from("E:\\Music\\signal.flac")]);
    }
}
