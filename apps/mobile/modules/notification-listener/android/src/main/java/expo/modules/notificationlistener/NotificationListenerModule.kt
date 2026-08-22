package expo.modules.notificationlistener

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.PowerManager
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

    // Otimização de bateria do Android é a causa mais comum de "detecção só
    // funciona com o app aberto": o sistema mata o processo (e junto o
    // NotificationListenerService, que vive no mesmo processo) quando o app
    // fica muito tempo em segundo plano sem interação — em fabricantes como
    // Xiaomi/Samsung/Oppo isso acontece de forma bem agressiva por padrão.
    // Ficar isento dessa otimização é o único jeito de garantir captura com o
    // app fechado sem virar um foreground service com notificação fixa (que
    // gastaria mais recurso, não menos).
    Function("isIgnoringBatteryOptimizations") {
      val context = appContext.reactContext ?: return@Function false
      val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
      powerManager.isIgnoringBatteryOptimizations(context.packageName)
    }

    Function("requestIgnoreBatteryOptimizations") {
      val context = appContext.reactContext ?: return@Function null
      val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
        data = Uri.parse("package:${context.packageName}")
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intent)
    }
  }
}
