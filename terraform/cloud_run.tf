resource "google_cloud_run_v2_service" "api" {
  name     = "eudora-api"
  location = var.gcp_region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cloud_run_runtime.email

    containers {
      image = "gcr.io/cloudrun/hello" # Bootstrap placeholder, ignored in future CI/CD runs

      ports {
        container_port = 3000
      }

      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_url.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_secret.secret_id
            version = "latest"
          }
        }
      }

      env {
        name  = "JWT_EXPIRATION"
        value = "1d"
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.postgres.connection_name]
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }

  depends_on = [
    google_sql_database_instance.postgres,
    google_secret_manager_secret.database_url,
    google_secret_manager_secret.jwt_secret,
  ]
}

# Allow unauthenticated invocation for the public API
resource "google_cloud_run_v2_service_iam_member" "api_public" {
  name     = google_cloud_run_v2_service.api.name
  location = google_cloud_run_v2_service.api.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service" "client" {
  name     = "eudora-client"
  location = var.gcp_region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cloud_run_runtime.email

    containers {
      image = "gcr.io/cloudrun/hello" # Bootstrap placeholder, ignored in future CI/CD runs

      ports {
        container_port = 3000
      }

      env {
        name  = "NEXT_PUBLIC_API_URL"
        value = google_cloud_run_v2_service.api.uri
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }

  depends_on = [
    google_cloud_run_v2_service.api
  ]
}

# Allow unauthenticated invocation for the public client (Web App)
resource "google_cloud_run_v2_service_iam_member" "client_public" {
  name     = google_cloud_run_v2_service.client.name
  location = google_cloud_run_v2_service.client.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
