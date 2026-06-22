# ──────────────────────────────────────────────────────────────────
# Service Account for GitHub Actions CD Deployer
# ──────────────────────────────────────────────────────────────────
resource "google_service_account" "github_actions" {
  account_id   = "github-deployer"
  display_name = "GitHub Actions CI/CD Deployer"
}

# Grant permissions to GitHub Actions service account
resource "google_project_iam_member" "artifact_registry_writer" {
  project = var.gcp_project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

resource "google_project_iam_member" "cloud_run_developer" {
  project = var.gcp_project_id
  role    = "roles/run.developer"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# ──────────────────────────────────────────────────────────────────
# Service Account for Cloud Run Runtime (API and Client)
# ──────────────────────────────────────────────────────────────────
resource "google_service_account" "cloud_run_runtime" {
  account_id   = "eudora-runtime-sa"
  display_name = "Eudora Cloud Run Runtime Service Account"
}

# Allow GitHub Actions to act as the Cloud Run service account
resource "google_service_account_iam_member" "github_actions_sa_user" {
  service_account_id = google_service_account.cloud_run_runtime.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.github_actions.email}"
}

# Grant Cloud SQL Client permission to runtime account
resource "google_project_iam_member" "cloud_sql_client" {
  project = var.gcp_project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloud_run_runtime.email}"
}

# Grant Secret Manager Access to runtime account
resource "google_secret_manager_secret_iam_member" "database_url_accessor" {
  secret_id = google_secret_manager_secret.database_url.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run_runtime.email}"
}

resource "google_secret_manager_secret_iam_member" "jwt_secret_accessor" {
  secret_id = google_secret_manager_secret.jwt_secret.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run_runtime.email}"
}

# ──────────────────────────────────────────────────────────────────
# Workload Identity Federation (WIF) Configuration
# ──────────────────────────────────────────────────────────────────
resource "google_iam_workload_identity_pool" "github_pool" {
  workload_identity_pool_id = "github-actions-pool"
  display_name              = "GitHub Actions WIF Pool"
  description               = "Identity pool for GitHub Actions authentication"
  disabled                  = false

  depends_on = [
    google_project_service.enabled_apis
  ]
}

resource "google_iam_workload_identity_pool_provider" "github_provider" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github_pool.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                        = "GitHub Provider"
  description                         = "OIDC identity provider for GitHub Actions"
  
  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
  }

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# Allow GitHub repository to assume the deployer service account via WIF
resource "google_service_account_iam_member" "wif_user" {
  service_account_id = google_service_account.github_actions.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_pool.name}/attribute.repository/${var.github_repository}"
}
