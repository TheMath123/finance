package expo.modules.notificationlistener

import android.app.Notification
import android.content.Context
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONArray
import org.json.JSONObject

/**
 * O sistema instancia isso sozinho (via o <service> declarado em
 * AndroidManifest.xml deste módulo) assim que o usuário concede acesso em
 * Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS — nunca é criado
 * diretamente pelo app. Só existe uma instância viva por processo, por isso
 * o companion object serve de ponte pro NotificationListenerModule (que
 * pode não existir ainda quando uma notificação chega, ou pode ser
 * recriado independentemente deste serviço).
 *
 * `onNotification` (o listener JS via sendEvent) só existe enquanto o RN/JS
 * do app está de fato rodando — na prática quase nunca é o caso quando uma
 * notificação de banco chega (app fechado/em segundo plano há tempo, sem
 * bridge viva). Sem buffer nativo, TODA notificação que chegasse nesse
 * estado era descartada silenciosamente: a causa raiz de "com autorização
 * concedida, mesmo assim nada era detectado" em produção. Agora toda
 * notificação é sempre persistida em SharedPreferences (sobrevive o processo
 * ser matado) — o listener ao vivo continua existindo só pra reatividade
 * imediata com o app aberto; NotificationListenerModule.drainBufferedNotifications()
 * é quem drena o que ficou acumulado, chamado pelo JS toda vez que o app
 * volta pro primeiro plano (ver use-notification-capture.ts).
 */
class AppNotificationListenerService : NotificationListenerService() {

  companion object {
    private var onNotification: ((Map<String, Any?>) -> Unit)? = null
    private const val PREFS_NAME = "notification_listener_buffer"
    private const val KEY_BUFFER = "buffered_notifications"
    private const val MAX_BUFFER_SIZE = 50

    fun setListener(listener: ((Map<String, Any?>) -> Unit)?) {
      onNotification = listener
    }

    private fun toJson(payload: Map<String, Any?>): JSONObject {
      val obj = JSONObject()
      for ((key, value) in payload) obj.put(key, value ?: JSONObject.NULL)
      return obj
    }

    private fun bufferNotification(context: Context, payload: Map<String, Any?>) {
      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      val array = JSONArray(prefs.getString(KEY_BUFFER, "[]"))
      array.put(toJson(payload))
      val overflow = array.length() - MAX_BUFFER_SIZE
      val trimmed = if (overflow > 0) {
        JSONArray().apply {
          for (i in overflow until array.length()) put(array.get(i))
        }
      } else {
        array
      }
      prefs.edit().putString(KEY_BUFFER, trimmed.toString()).apply()
    }

    /** Lê e limpa o buffer de uma vez — cada notificação só deve ser processada uma vez pelo JS. */
    fun drainBuffer(context: Context): List<Map<String, Any?>> {
      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      val array = JSONArray(prefs.getString(KEY_BUFFER, "[]"))
      prefs.edit().remove(KEY_BUFFER).apply()
      return (0 until array.length()).map { i ->
        val obj = array.getJSONObject(i)
        obj.keys().asSequence().associateWith { key ->
          if (obj.isNull(key)) null else obj.get(key)
        }
      }
    }
  }

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    val extras = sbn.notification.extras
    val payload = mapOf(
      "packageName" to sbn.packageName,
      "postTime" to sbn.postTime,
      "title" to extras.getCharSequence(Notification.EXTRA_TITLE)?.toString(),
      "text" to extras.getCharSequence(Notification.EXTRA_TEXT)?.toString(),
      "bigText" to extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
    )
    bufferNotification(applicationContext, payload)
    onNotification?.invoke(payload)
  }

  override fun onNotificationRemoved(sbn: StatusBarNotification) {
    // Só a chegada da notificação interessa pro auto-registro de transação.
  }
}
