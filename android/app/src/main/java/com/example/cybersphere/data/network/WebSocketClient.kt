package com.example.cybersphere.data.network

import android.util.Log
import com.example.cybersphere.data.session.SessionManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject
import java.util.concurrent.TimeUnit

enum class TelemetryState {
    LIVE,
    RECONNECTING,
    OFFLINE
}

data class RealtimeEvent(
    val type: String,
    val payload: JSONObject
)

class MonitoringWebSocketClient(private val sessionManager: SessionManager) {
    companion object {
        const val WS_URL = "ws://10.0.2.2:8000/ws/monitoring/"
        const val TAG = "CyberWebSocket"
    }

    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .pingInterval(15, TimeUnit.SECONDS)
        .build()

    private var webSocket: WebSocket? = null
    private val scope = CoroutineScope(Dispatchers.IO)

    private val _connectionState = MutableStateFlow(TelemetryState.OFFLINE)
    val connectionState: StateFlow<TelemetryState> = _connectionState.asStateFlow()

    private val _incomingEvents = MutableSharedFlow<RealtimeEvent>()
    val incomingEvents: SharedFlow<RealtimeEvent> = _incomingEvents.asSharedFlow()

    fun connect() {
        val token = sessionManager.getAccessToken()
        val urlWithToken = if (!token.isNullOrBlank()) {
            "$WS_URL?token=$token"
        } else {
            WS_URL
        }

        _connectionState.value = TelemetryState.RECONNECTING

        val request = Request.Builder()
            .url(urlWithToken)
            .build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.d(TAG, "WebSocket connected successfully.")
                _connectionState.value = TelemetryState.LIVE
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                Log.d(TAG, "WebSocket message received: $text")
                try {
                    val json = JSONObject(text)
                    val eventType = json.optString("type", "message")
                    scope.launch {
                        _incomingEvents.emit(RealtimeEvent(eventType, json))
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to parse WS payload: ${e.message}")
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.w(TAG, "WebSocket failure: ${t.message}. Reconnecting in background.")
                _connectionState.value = TelemetryState.OFFLINE
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.d(TAG, "WebSocket closed: $code $reason")
                _connectionState.value = TelemetryState.OFFLINE
            }
        })
    }

    fun disconnect() {
        try {
            webSocket?.close(1000, "App moving to background/logout")
            webSocket = null
        } catch (e: Exception) {
            Log.e(TAG, "Error closing websocket: ${e.message}")
        }
        _connectionState.value = TelemetryState.OFFLINE
    }
}
