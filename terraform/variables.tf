variable "gcp_project_id" {
  type        = string
  description = "The GCP Project ID where resources will be provisioned."
}

variable "gcp_region" {
  type        = string
  default     = "us-central1"
  description = "The GCP region to deploy resources to."
}

variable "db_password" {
  type        = string
  sensitive   = true
  description = "Password for the PostgreSQL database admin (postgres user)."
}

variable "github_repository" {
  type        = string
  default     = "The-Digital-Dude/eudora_v2"
  description = "The GitHub repository (format: owner/repo) authorized to authenticate via Workload Identity."
}

variable "db_tier" {
  type        = string
  default     = "db-f1-micro"
  description = "The machine tier/class for the Cloud SQL PostgreSQL instance."
}
