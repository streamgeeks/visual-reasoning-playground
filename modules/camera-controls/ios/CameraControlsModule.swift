import ExpoModulesCore
import AVFoundation
import UIKit

public class CameraControlsModule: Module {
    private var captureDevice: AVCaptureDevice?
    
    public func definition() -> ModuleDefinition {
        Name("CameraControls")
        
        AsyncFunction("setWhiteBalanceTemperature") { (kelvin: Int) in
            guard let device = self.getDevice() else {
                throw NSError(domain: "CameraControls", code: 1, userInfo: [NSLocalizedDescriptionKey: "Camera not available"])
            }
            
            try device.lockForConfiguration()
            defer { device.unlockForConfiguration() }
            
            let clampedKelvin = Float(max(2000, min(8000, kelvin)))
            let temperatureAndTint = AVCaptureDevice.WhiteBalanceTemperatureAndTintValues(
                temperature: clampedKelvin,
                tint: 0.0
            )
            
            var gains = device.deviceWhiteBalanceGains(for: temperatureAndTint)
            gains = self.normalizeGains(gains, for: device)
            
            device.setWhiteBalanceModeLocked(with: gains, completionHandler: nil)
        }
        
        AsyncFunction("setWhiteBalanceTint") { (tint: Float) in
            guard let device = self.getDevice() else {
                throw NSError(domain: "CameraControls", code: 1, userInfo: [NSLocalizedDescriptionKey: "Camera not available"])
            }
            
            try device.lockForConfiguration()
            defer { device.unlockForConfiguration() }
            
            let clampedTint = max(-150.0, min(150.0, tint))
            let temperatureAndTint = AVCaptureDevice.WhiteBalanceTemperatureAndTintValues(
                temperature: 5500.0,
                tint: clampedTint
            )
            
            var gains = device.deviceWhiteBalanceGains(for: temperatureAndTint)
            gains = self.normalizeGains(gains, for: device)
            
            device.setWhiteBalanceModeLocked(with: gains, completionHandler: nil)
        }
        
        AsyncFunction("setExposureCompensation") { (value: Float) in
            guard let device = self.getDevice() else {
                throw NSError(domain: "CameraControls", code: 1, userInfo: [NSLocalizedDescriptionKey: "Camera not available"])
            }
            
            try device.lockForConfiguration()
            defer { device.unlockForConfiguration() }
            
            let minBias = device.minExposureTargetBias
            let maxBias = device.maxExposureTargetBias
            let clamped = max(minBias, min(maxBias, value))
            
            device.setExposureTargetBias(clamped, completionHandler: nil)
        }
        
        AsyncFunction("setISO") { (iso: Float) in
            guard let device = self.getDevice() else {
                throw NSError(domain: "CameraControls", code: 1, userInfo: [NSLocalizedDescriptionKey: "Camera not available"])
            }
            
            try device.lockForConfiguration()
            defer { device.unlockForConfiguration() }
            
            let minISO = device.activeFormat.minISO
            let maxISO = device.activeFormat.maxISO
            let clampedISO = max(minISO, min(maxISO, iso))
            
            device.setExposureModeCustom(
                duration: AVCaptureDevice.currentExposureDuration,
                iso: clampedISO,
                completionHandler: nil
            )
        }
        
        AsyncFunction("resetToAuto") {
            guard let device = self.getDevice() else {
                throw NSError(domain: "CameraControls", code: 1, userInfo: [NSLocalizedDescriptionKey: "Camera not available"])
            }
            
            try device.lockForConfiguration()
            defer { device.unlockForConfiguration() }
            
            if device.isExposureModeSupported(.continuousAutoExposure) {
                device.exposureMode = .continuousAutoExposure
            }
            
            if device.isWhiteBalanceModeSupported(.continuousAutoWhiteBalance) {
                device.whiteBalanceMode = .continuousAutoWhiteBalance
            }
        }
        
        Function("isAvailable") { () -> Bool in
            return self.getDevice() != nil
        }
        
        Function("getDeviceInfo") { () -> [String: Any] in
            guard let device = self.getDevice() else {
                return ["available": false]
            }
            
            return [
                "available": true,
                "minExposureBias": device.minExposureTargetBias,
                "maxExposureBias": device.maxExposureTargetBias,
                "minISO": device.activeFormat.minISO,
                "maxISO": device.activeFormat.maxISO
            ]
        }
    }
    
    private func getDevice() -> AVCaptureDevice? {
        if captureDevice == nil {
            captureDevice = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back)
        }
        return captureDevice
    }
    
    private func normalizeGains(_ gains: AVCaptureDevice.WhiteBalanceGains, for device: AVCaptureDevice) -> AVCaptureDevice.WhiteBalanceGains {
        var normalized = gains
        let maxGain = device.maxWhiteBalanceGain
        
        normalized.redGain = max(1.0, min(maxGain, gains.redGain))
        normalized.greenGain = max(1.0, min(maxGain, gains.greenGain))
        normalized.blueGain = max(1.0, min(maxGain, gains.blueGain))
        
        return normalized
    }
}
