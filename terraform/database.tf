resource "google_sql_database_instance" "postgres" {
  name             = "eudora-db-instance"
  database_version = "POSTGRES_17"
  region           = var.gcp_region

  settings {
    tier = var.db_tier

    ip_configuration {
      ipv4_enabled = true
      # Secure the database: Cloud SQL Auth Proxy connections are authorized via IAM.
      # No public IP whitelisting needed.
    }
  }

  deletion_protection = false # Set to true for production to prevent accidental deletion

  depends_on = [
    google_project_service.enabled_apis
  ]
}

resource "google_sql_database" "database" {
  name     = "eudora_db"
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "db_user" {
  name     = "postgres"
  instance = google_sql_database_instance.postgres.name
  password = var.db_password
}
