resource "google_artifact_registry_repository" "eudora_images" {
  location      = var.gcp_region
  repository_id = "eudora-images"
  description   = "Docker registry for Eudora applications (api-service and client)"
  format        = "DOCKER"

  depends_on = [
    google_project_service.enabled_apis
  ]
}
