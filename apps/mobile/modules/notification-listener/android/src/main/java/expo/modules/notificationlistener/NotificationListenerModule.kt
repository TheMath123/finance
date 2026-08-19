package expo.modules.notificationlistener

import android.content.Intent
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NotificationListenerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NotificationListener")

    Events("onNotificationPosted")

    OnCreate {
      AppNotificationListenerService.setListener { payload ->
        sendEvent("onNotificationPosted", payload)
      }
    }

    OnDestroy {
      AppNotificationListenerService.setListener(null)
    }

    Function("isPermissionGranted") {
      val context = appContext.reactContext ?: return@Function false
      NotificationManagerCompat.getEnabledListenerPackages(context)
        .contains(context.packageName)
    }

    Function("openNotificationSettings") {
      // `Function {}` espera Any? — return@Function sem valor só compila se o
      // alvo fosse Unit, daqui o `null` explícito (não tem nada útil pra
      // devolver pro JS de qualquer forma).
      val context = appContext.reactContext ?: return@Function null
      val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intent)
    }

    // Notificações que chegaram com o app fechado/em segundo plano (sem
    // bridge JS viva pro sendEvent alcançar) ficam acumuladas nativamente —
    // ver AppNotificationListenerService.bufferNotification. Chamado pelo JS
    // toda vez que o app volta pro primeiro plano, pra não perder nada.
    Function("drainBufferedNotifications") {
      val context = appContext.reactContext ?: return@Function emptyList<Map<String, Any?>>()
      AppNotificationListenerService.drainBuffer(context)
    }
  }
}
