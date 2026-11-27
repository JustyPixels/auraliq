use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};

use url::{Host, Url};

use crate::error::AppError;

fn is_disallowed_ipv4(ip: Ipv4Addr) -> bool {
    ip.is_loopback()
        || ip.is_private()
        || ip.is_link_local()
        || ip.is_unspecified()
        || ip.is_broadcast()
        || ip.is_multicast()
        || (ip.octets()[0] == 100 && (ip.octets()[1] & 0b1100_0000) == 64)
}

fn is_disallowed_ipv6(ip: Ipv6Addr) -> bool {
    ip.is_loopback()
        || ip.is_unspecified()
        || ip.is_multicast()
        || (ip.segments()[0] & 0xfe00) == 0xfc00
        || (ip.segments()[0] & 0xffc0) == 0xfe80
}

pub fn validate_remote_url(raw: &str, allow_http: bool) -> Result<Url, AppError> {
    let url =
        Url::parse(raw.trim()).map_err(|e| AppError::Security(format!("Invalid URL: {e}")))?;

    match url.scheme() {
        "https" => {}
        "http" if allow_http => {}
        scheme => {
            return Err(AppError::Security(format!(
                "Disallowed URL scheme: {scheme}"
            )));
        }
    }

    let Some(host) = url.host() else {
        return Err(AppError::Security(
            "URL must include a valid host".to_string(),
        ));
    };

    match host {
        Host::Domain(domain) => {
            let lower = domain.to_ascii_lowercase();
            if lower == "localhost" || lower.ends_with(".localhost") || lower.ends_with(".local") {
                return Err(AppError::Security(format!("Blocked local host: {domain}")));
            }
        }
        Host::Ipv4(ip) => {
            if is_disallowed_ipv4(ip) {
                return Err(AppError::Security(format!(
                    "Blocked private or loopback IP: {ip}"
                )));
            }
        }
        Host::Ipv6(ip) => {
            let disallowed = match ip.to_ipv4_mapped() {
                Some(v4) => is_disallowed_ipv4(v4),
                None => is_disallowed_ipv6(ip),
            };
            if disallowed {
                return Err(AppError::Security(format!(
                    "Blocked private or loopback IPv6: {ip}"
                )));
            }
        }
    }

    if let Ok(ip) = url.host_str().unwrap_or_default().parse::<IpAddr>() {
        let blocked = match ip {
            IpAddr::V4(v4) => is_disallowed_ipv4(v4),
            IpAddr::V6(v6) => is_disallowed_ipv6(v6),
        };
        if blocked {
            return Err(AppError::Security(
                "Blocked internal IP address".to_string(),
            ));
        }
    }

    Ok(url)
}

pub fn sanitize_filename(name: &str) -> Result<String, AppError> {
    let trimmed = name.trim();
    if trimmed.is_empty() || trimmed == "." || trimmed == ".." || trimmed.contains("..") {
        return Err(AppError::Security("Invalid filename".to_string()));
    }
    if trimmed.contains('/') || trimmed.contains('\\') {
        return Err(AppError::Security(
            "Filename cannot contain path separators".to_string(),
        ));
    }
    let cleaned: String = trimmed
        .chars()
        .map(|c| match c {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
            c if c.is_control() => '_',
            c => c,
        })
        .collect();
    let final_name = cleaned.trim().to_string();
    if final_name.is_empty() {
        return Err(AppError::Security(
            "Filename is empty after sanitization".to_string(),
        ));
    }
    Ok(final_name)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_remote_urls_and_blocks_ssrf() {
        assert!(validate_remote_url("https://archive.org/download/test.mp3", false).is_ok());
        assert!(validate_remote_url("http://stream.radiobrowser.info/radio", true).is_ok());
        assert!(validate_remote_url("http://stream.radiobrowser.info/radio", false).is_err());

        assert!(validate_remote_url("file:///C:/Windows/win.ini", true).is_err());
        assert!(validate_remote_url("javascript:alert(1)", true).is_err());
        assert!(validate_remote_url("http://localhost:8080/audio", true).is_err());
        assert!(validate_remote_url("http://127.0.0.1/test.mp3", true).is_err());
        assert!(validate_remote_url("https://192.168.1.10/stream", true).is_err());
        assert!(validate_remote_url("https://10.0.0.5/stream", true).is_err());
    }

    #[test]
    fn sanitizes_filenames_and_blocks_traversal() {
        assert_eq!(
            sanitize_filename("track: 01?.mp3").unwrap(),
            "track_ 01_.mp3"
        );
        assert!(sanitize_filename("../evil.mp3").is_err());
        assert!(sanitize_filename("dir/file.mp3").is_err());
        assert!(sanitize_filename("").is_err());
    }
}
