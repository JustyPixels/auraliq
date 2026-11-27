use keyring::{Entry, Error as KeyringError};

use crate::error::AppError;

const SERVICE_NAME: &str = "dev.auraliq.app";

pub struct CredentialStore;

impl CredentialStore {
    fn entry(provider_id: &str, field: &str) -> Result<Entry, AppError> {
        let account = format!("{provider_id}:{field}");
        Entry::new(SERVICE_NAME, &account)
            .map_err(|e| AppError::Security(format!("Keyring init failed: {e}")))
    }

    pub fn set_secret(provider_id: &str, field: &str, value: &str) -> Result<(), AppError> {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            return Err(AppError::Config(
                "Credential value cannot be empty".to_string(),
            ));
        }
        let entry = Self::entry(provider_id, field)?;
        entry
            .set_password(trimmed)
            .map_err(|e| AppError::Security(format!("Failed to store credential: {e}")))
    }

    pub fn get_secret(provider_id: &str, field: &str) -> Result<Option<String>, AppError> {
        let entry = Self::entry(provider_id, field)?;
        match entry.get_password() {
            Ok(secret) => Ok(Some(secret)),
            Err(KeyringError::NoEntry) => Ok(None),
            Err(e) => Err(AppError::Security(format!(
                "Failed to read credential: {e}"
            ))),
        }
    }

    pub fn has_secret(provider_id: &str, field: &str) -> bool {
        matches!(Self::get_secret(provider_id, field), Ok(Some(s)) if !s.is_empty())
    }

    pub fn delete_secret(provider_id: &str, field: &str) -> Result<(), AppError> {
        let entry = Self::entry(provider_id, field)?;
        match entry.delete_credential() {
            Ok(()) | Err(KeyringError::NoEntry) => Ok(()),
            Err(e) => Err(AppError::Security(format!(
                "Failed to delete credential: {e}"
            ))),
        }
    }
}
