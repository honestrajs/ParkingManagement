package com.bikestandapp

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.bridge.Promise
import com.hoho.android.usbserial.driver.UsbSerialDriver
import com.hoho.android.usbserial.driver.UsbSerialPort
import com.hoho.android.usbserial.driver.UsbSerialProber
import com.hoho.android.usbserial.util.SerialInputOutputManager
import java.nio.charset.Charset
import java.util.concurrent.Executors

class UsbSerialModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), SerialInputOutputManager.Listener {
  private val usbManager: UsbManager = reactContext.getSystemService(Context.USB_SERVICE) as UsbManager
  private var usbPort: UsbSerialPort? = null
  private var ioManager: SerialInputOutputManager? = null
  private val executor = Executors.newSingleThreadExecutor()
  private val buffer = StringBuilder()

  private var currentStatus: String = "STATUS:STOPPED"

  private val permissionAction = "com.bikestandapp.USB_PERMISSION"
  private var permissionRegistered: Boolean = false
  private var pendingDriver: UsbSerialDriver? = null
  private var pendingBaud: Int = 115200

  private val permissionReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
      if (intent.action != permissionAction) return
      val granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)
      val driver = pendingDriver
      if (granted && driver != null) {
        try {
          val connection = usbManager.openDevice(driver.device)
          if (connection != null) {
            usbPort = driver.ports[0]
            usbPort?.open(connection)
            usbPort?.setParameters(pendingBaud, 8, UsbSerialPort.STOPBITS_1, UsbSerialPort.PARITY_NONE)
            ioManager = SerialInputOutputManager(usbPort, this@UsbSerialModule)
            executor.submit(ioManager)
            emit("UsbSerialEvent", "STATUS:STARTED")
          } else {
            emit("UsbSerialEvent", "STATUS:NO_PERMISSION")
          }
        } catch (e: Exception) {
          emit("UsbSerialEvent", "ERROR:${e.message}")
        }
      } else {
        emit("UsbSerialEvent", "STATUS:NO_PERMISSION")
      }
    }
  }

  override fun getName(): String = "UsbSerialModule"

  private fun emit(event: String, message: String) {
    val params = Arguments.createMap()
    params.putString("data", message)
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(event, params)
  }

  private fun setStatus(status: String) {
    currentStatus = status
    emit("UsbSerialEvent", status)
  }

  // Required for NativeEventEmitter bridge contract
  @ReactMethod
  fun addListener(eventName: String) {
    // No-op. Required for RN event emitter.
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    // No-op. Required for RN event emitter.
  }

  @ReactMethod
  fun start(baudRate: Int) {
    try {
      stop()
      setStatus("STATUS:CONNECTING")
      val drivers: List<UsbSerialDriver> = UsbSerialProber.getDefaultProber().findAllDrivers(usbManager)
      if (drivers.isEmpty()) {
        // If no driver, prompt permission for any connected USB device to let user grant access
        val deviceList = usbManager.deviceList
        if (deviceList.isEmpty()) {
          setStatus("STATUS:NO_DEVICE")
          return
        }
        val firstDevice = deviceList.values.first()
        if (!usbManager.hasPermission(firstDevice)) {
          if (!permissionRegistered) {
            reactContext.registerReceiver(permissionReceiver, IntentFilter(permissionAction))
            permissionRegistered = true
          }
          val pi = PendingIntent.getBroadcast(reactContext, 0, Intent(permissionAction), PendingIntent.FLAG_IMMUTABLE)
          usbManager.requestPermission(firstDevice, pi)
          setStatus("STATUS:REQUESTING_PERMISSION")
          return
        } else {
          setStatus("STATUS:NO_DRIVER")
          return
        }
      }
      val driver = drivers[0]
      pendingDriver = driver
      pendingBaud = baudRate

      if (!usbManager.hasPermission(driver.device)) {
        // Register receiver and request permission
        if (!permissionRegistered) {
          reactContext.registerReceiver(permissionReceiver, IntentFilter(permissionAction))
          permissionRegistered = true
        }
        val pi = PendingIntent.getBroadcast(reactContext, 0, Intent(permissionAction), PendingIntent.FLAG_IMMUTABLE)
        usbManager.requestPermission(driver.device, pi)
        emit("UsbSerialEvent", "STATUS:REQUESTING_PERMISSION")
        return
      }

      val connection = usbManager.openDevice(driver.device)
      if (connection == null) {
        setStatus("STATUS:NO_PERMISSION")
        return
      }
      usbPort = driver.ports[0]
      usbPort?.open(connection)
      usbPort?.setParameters(baudRate, 8, UsbSerialPort.STOPBITS_1, UsbSerialPort.PARITY_NONE)
      // Purge any pending bytes so old scans aren't delivered on resume
      try { usbPort?.purgeHwBuffers(true, true) } catch (_: Exception) {}
      synchronized(buffer) { buffer.setLength(0) }
      ioManager = SerialInputOutputManager(usbPort, this)
      executor.submit(ioManager)
      setStatus("STATUS:STARTED")
    } catch (e: Exception) {
      emit("UsbSerialEvent", "ERROR:${e.message}")
    }
  }

  @ReactMethod
  fun stop() {
    try {
      ioManager?.stop()
      ioManager = null
      usbPort?.close()
      usbPort = null
      // Clear any accumulated partial line data
      synchronized(buffer) { buffer.setLength(0) }
      if (permissionRegistered) {
        try { reactContext.unregisterReceiver(permissionReceiver) } catch (_: Exception) {}
        permissionRegistered = false
      }
      setStatus("STATUS:STOPPED")
    } catch (_: Exception) {}
  }

  override fun onNewData(data: ByteArray) {
    val text = String(data, Charset.forName("UTF-8"))
    synchronized(buffer) {
      buffer.append(text)
      var idx = buffer.indexOf("\n")
      while (idx >= 0) {
        val line = buffer.substring(0, idx).trim()
        buffer.delete(0, idx + 1)
        emit("UsbSerialData", line)
        idx = buffer.indexOf("\n")
      }
    }
  }

  override fun onRunError(e: Exception) {
    emit("UsbSerialEvent", "ERROR:${e.message}")
  }

  @ReactMethod
  fun getStatus(promise: Promise) {
    promise.resolve(currentStatus)
  }
}


