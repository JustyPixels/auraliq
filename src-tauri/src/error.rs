use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("configuration error: {0}")]
    Config(String),
    #[error("internal error: {0}")]
    Internal(String),
    #[error("database error: {0}")]
    Database(String),
    #[error("filesystem error: {0}")]
    Io(String),
    #[error("audio error: {0}")]
    Audio(String),
    #[error("metadata error: {0}")]
    Metadata(String),
    #[error("not found: {0}")]
    NotFound(String),
    #[error("unsupported format: {0}")]
    UnsupportedFormat(String),
}

#[derive(Debug, Serialize)]
struct SerializedError {
    code: &'static str,
    message: String,
}

impl AppError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::Config(_) => "CONFIG_ERROR",
            Self::Internal(_) => "INTERNAL_ERROR",
            Self::Database(_) => "DATABASE_ERROR",
            Self::Io(_) => "IO_ERROR",
            Self::Audio(_) => "AUDIO_ERROR",
            Self::Metadata(_) => "METADATA_ERROR",
            Self::NotFound(_) => "NOT_FOUND",
            Self::UnsupportedFormat(_) => "UNSUPPORTED_FORMAT",
        }
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        Self::Io(err.to_string())
    }
}

impl From<rusqlite::Error> for AppError {
    fn from(err: rusqlite::Error) -> Self {
        Self::Database(err.to_string())
    }
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        SerializedError {
            code: self.code(),
            message: self.to_string(),
        }
        .serialize(serializer)
    }
}

#[cfg(test)]
mod tests {
    use super::AppError;

    #[test]
    fn serializes_structured_error() {
        let err = AppError::Config("missing folder".to_string());
        let json = serde_json::to_value(&err).expect("AppError should serialize");
        assert_eq!(json["code"], "CONFIG_ERROR");
        assert_eq!(json["message"], "configuration error: missing folder");
    }

    #[test]
    fn maps_unsupported_format_code() {
        let err = AppError::UnsupportedFormat("WMA is not supported".to_string());
        let json = serde_json::to_value(&err).expect("AppError should serialize");
        assert_eq!(json["code"], "UNSUPPORTED_FORMAT");
    }
}
