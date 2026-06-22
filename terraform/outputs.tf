output "gcp_project_id" {
  value       = var.gcp_project_id
  description = "The GCP Project ID (set as GitHub variable GCP_PROJECT_ID)"
}

output "gcp_region" {
  value       = var.gcp_region
  description = "The GCP Region (set as GitHub variable GCP_REGION)"
}

output "wif_provider_id" {
  value       = google_iam_workload_identity_pool_provider.github_provider.name
  description = "The Workload Identity Provider ID (set as GitHub secret GCP_WIF_PROVIDER)"
}

output "github_sa_email" {
  value       = google_service_account.github_actions.email
  description = "The email of the GitHub deployer service account (set as GitHub secret GCP_SA_EMAIL)"
}

output "db_connection_name" {
  value       = google_sql_database_instance.postgres.connection_name
  description = "The Cloud SQL connection name"
}

output "api_service_url" {
  value       = google_cloud_run_v2_service.api.uri
  description = "The deployed URL of the Eudora API service"
}

output "client_url" {
  value       = google_cloud_run_v2_service.client.uri
  description = "The deployed URL of the Eudora Next.js client"
}
