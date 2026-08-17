package expo.modules.notificationlistener

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

/**
 * O sistema instancia isso sozinho (via o <service> declarado em
 * AndroidManifest.xml deste módulo) assim que o usuário concede acesso em
 * Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS — nunca é criado
 * diretamente pelo app. Só existe uma instância viva por processo, por isso
 * o companion object serve de ponte pro NotificationListenerModule (que
 * pode não existir ainda quando uma notificação chega, ou pode ser
 * recriado independentemente deste serviço).
 */
class AppNotificationListenerService : NotificationListenerService() {

  companion object {
    private var onNotification: ((Map<String, Any?>) -> Unit)? = null

    fun setListener(listener: ((Map<String, Any?>) -> Unit)?) {
      onNotification = listener
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
    onNotification?.invoke(payload)
  }

  override fun onNotificationRemoved(sbn: StatusBarNotification) {
    // Só a chegada da notificação interessa pro auto-registro de transação.
  }
}
