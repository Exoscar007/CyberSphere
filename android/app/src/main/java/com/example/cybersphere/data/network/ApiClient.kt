package com.example.cybersphere.data.network

import android.util.Log
import com.example.cybersphere.data.session.SessionManager
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.logging.HttpLoggingInterceptor
import java.util.concurrent.TimeUnit

class ApiClient(private val sessionManager: SessionManager) {
    companion object {
        const val BASE_URL = "http://10.0.2.2:8000"
        const val TAG = "CyberApiClient"
        private val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()
    }

    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .writeTimeout(10, TimeUnit.SECONDS)
        .addInterceptor { chain ->
            val original = chain.request()
            val requestBuilder = original.newBuilder()
                .header("Accept", "application/json")
                .header("Content-Type", "application/json")

            val token = sessionManager.getAccessToken()
            if (!token.isNullOrBlank()) {
                requestBuilder.header("Authorization", "Bearer $token")
            }

            val response = chain.proceed(requestBuilder.build())
            if (response.code == 401) {
                Log.w(TAG, "Received 401 Unauthorized from ${original.url}")
            }
            response
        }
        .build()

    fun get(endpoint: String): NetworkResult {
        val url = if (endpoint.startsWith("http")) endpoint else "$BASE_URL$endpoint"
        val request = Request.Builder().url(url).get().build()
        return execute(request)
    }

    fun post(endpoint: String, jsonBody: String): NetworkResult {
        val url = if (endpoint.startsWith("http")) endpoint else "$BASE_URL$endpoint"
        val body = jsonBody.toRequestBody(JSON_MEDIA_TYPE)
        val request = Request.Builder().url(url).post(body).build()
        return execute(request)
    }

    fun patch(endpoint: String, jsonBody: String): NetworkResult {
        val url = if (endpoint.startsWith("http")) endpoint else "$BASE_URL$endpoint"
        val body = jsonBody.toRequestBody(JSON_MEDIA_TYPE)
        val request = Request.Builder().url(url).patch(body).build()
        return execute(request)
    }

    fun delete(endpoint: String): NetworkResult {
        val url = if (endpoint.startsWith("http")) endpoint else "$BASE_URL$endpoint"
        val request = Request.Builder().url(url).delete().build()
        return execute(request)
    }

    private fun execute(request: Request): NetworkResult {
        return try {
            val response = client.newCall(request).execute()
            val bodyString = response.body?.string() ?: ""
            if (response.isSuccessful) {
                NetworkResult.Success(response.code, bodyString)
            } else {
                NetworkResult.Error(response.code, bodyString)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Network call failed: ${e.message}")
            NetworkResult.Failure(e)
        }
    }
}

sealed class NetworkResult {
    data class Success(val code: Int, val body: String) : NetworkResult()
    data class Error(val code: Int, val errorBody: String) : NetworkResult()
    data class Failure(val exception: Throwable) : NetworkResult()
}
