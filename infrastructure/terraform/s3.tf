# =============================================================================
# S3 Buckets for ProDentHub Campaigns
# =============================================================================

# -----------------------------------------------------------------------------
# Score Reports Bucket
# -----------------------------------------------------------------------------
resource "aws_s3_bucket" "score_reports" {
  bucket = "${var.project_name}-score-reports-${var.environment}"

  tags = {
    Name = "Score Reports Bucket"
  }
}

resource "aws_s3_bucket_versioning" "score_reports" {
  bucket = aws_s3_bucket.score_reports.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "score_reports" {
  bucket = aws_s3_bucket.score_reports.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "score_reports" {
  bucket = aws_s3_bucket.score_reports.id

  rule {
    id     = "expire-old-reports"
    status = "Enabled"

    expiration {
      days = 90
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

resource "aws_s3_bucket_public_access_block" "score_reports" {
  bucket = aws_s3_bucket.score_reports.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "score_reports" {
  bucket = aws_s3_bucket.score_reports.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST", "GET"]
    allowed_origins = [var.frontend_url]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}
