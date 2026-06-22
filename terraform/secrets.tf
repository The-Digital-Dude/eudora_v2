resource "google_secret_manager_secret" "database_url" {
  secret_id = "DATABASE_URL"

  replication {
    auto {}
  }

  depends_on = [
    google_project_service.enabled_apis
  ]
}

resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "JWT_SECRET"

  replication {
    auto {}
  }

  depends_on = [
    google_project_service.enabled_apis
  ]
}
