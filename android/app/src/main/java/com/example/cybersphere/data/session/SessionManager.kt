package com.example.cybersphere.data.session

import android.content.Context
import android.content.SharedPreferences
import com.example.cybersphere.data.models.User
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class SessionManager(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("cybersphere_session", Context.MODE_PRIVATE)
    private val json = Json { ignoreUnknownKeys = true }

    fun saveTokens(accessToken: String, refreshToken: String) {
        prefs.edit()
            .putString("access_token", accessToken)
            .putString("refresh_token", refreshToken)
            .apply()
    }

    fun getAccessToken(): String? = prefs.getString("access_token", null)

    fun getRefreshToken(): String? = prefs.getString("refresh_token", null)

    fun saveUser(user: User) {
        val userJson = json.encodeToString(user)
        prefs.edit()
            .putString("user_data", userJson)
            .putString("user_role", user.role)
            .apply()
    }

    fun getUser(): User? {
        val userJson = prefs.getString("user_data", null) ?: return null
        return try {
            json.decodeFromString<User>(userJson)
        } catch (e: Exception) {
            null
        }
    }

    fun getUserRole(): String = prefs.getString("user_role", "POLICE_OFFICER") ?: "POLICE_OFFICER"

    fun isLoggedIn(): Boolean = !prefs.getString("access_token", null).isNullOrBlank()

    fun clearSession() {
        prefs.edit().clear().apply()
    }
}
