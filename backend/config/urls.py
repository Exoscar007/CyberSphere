from django.contrib import admin
from django.urls import path, include
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

schema_view = get_schema_view(
   openapi.Info(
      title="CyberSphere API",
      default_version='v1',
      description="API documentation for Crime Hotspot Mapping Platform",
   ),
   public=True,
   permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/crimes/', include('crimes.urls')),
    path('api/intelligence/', include('intelligence.urls')),
    path('api/gis/', include('gis.urls')),
    path('api/ai/', include('ai_prediction.urls')),
    path('api/dashboard/', include('dashboard.urls')),
    path('api/patrol/', include('patrol.urls')),
    path('api/reports/', include('reports.urls')),
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
]
