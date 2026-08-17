from .models import PredictionJob

class AIPredictionRepository:
    @staticmethod
    def create_job():
        job = PredictionJob()
        job.save()
        return job

    @staticmethod
    def update_job_status(job_id, status, details=""):
        job = PredictionJob.objects.get(id=job_id)
        job.status = status
        job.details = details
        job.save()
        return job

    @staticmethod
    def get_job(job_id):
        try:
            return PredictionJob.objects.get(id=job_id)
        except PredictionJob.DoesNotExist:
            return None
