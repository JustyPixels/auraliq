use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("configuration error: {0}")]
    Config(String),
    #[error("internal error: {0}")]
    Internal(String),
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
        }
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
}
