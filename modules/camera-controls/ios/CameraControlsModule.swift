import ExpoModulesCore
import AVFoundation
import UIKit

public class CameraControlsModule: Module {
    
    public func definition() -> ModuleDefinition {
        Name("CameraControls")
        
        AsyncFunction("setWhiteBalanceTemperature") { (kelvin: Int) in
            guard let device = self.findActiveCamera() else {
                throw NSError(domain: "CameraControls", code: 1, userInfo: [NSLocalizedDescriptionKey: "No active camera found"])
            }
            
            guard device.isWhiteBalanceModeSupported(.locked) else {
                throw NSError(domain: "CameraControls", code: 2, userInfo: [NSLocalizedDescriptionKey: "White balance lock not supported"])
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
            
            return ["success": true, "temperature": kelvin]
        }
        
        AsyncFunction("setWhiteBalanceTint") { (tint: Float) in
            guard let device = self.findActiveCamera() else {
                throw NSError(domain: "CameraControls", code: 1, userInfo: [NSLocalizedDescriptionKey: "No active camera found"])
            }
            
            guard device.isWhiteBalanceModeSupported(.locked) else {
                throw NSError(domain: "CameraControls", code: 2, userInfo: [NSLocalizedDescriptionKey: "White balance lock not supported"])
            }
            
            try device.lockForConfiguration()
            defer { device.unlockForConfiguration() }
            
            let currentGains = device.deviceWhiteBalanceGains
            let currentTemp = device.temperatureAndTintValues(for: currentGains)
            
            let clampedTint = max(-150.0, min(150.0, tint))
            let temperatureAndTint = AVCaptureDevice.WhiteBalanceTemperatureAndTintValues(
                temperature: currentTemp.temperature,
                tint: clampedTint
            )
            
            var gains = device.deviceWhiteBalanceGains(for: temperatureAndTint)
            gains = self.normalizeGains(gains, for: device)
            
            device.setWhiteBalanceModeLocked(with: gains, completionHandler: nil)
            
            return ["success": true, "tint": tint]
        }
        
        AsyncFunction("setExposureCompensation") { (value: Float) in
            guard let device = self.findActiveCamera() else {
                throw NSError(domain: "CameraControls", code: 1, userInfo: [NSLocalizedDescriptionKey: "No active camera found"])
            }
            
            try device.lockForConfiguration()
            defer { device.unlockForConfiguration() }
            
            let minBias = device.minExposureTargetBias
            let maxBias = device.maxExposureTargetBias
            let clamped = max(minBias, min(maxBias, value))
            
            device.setExposureTargetBias(clamped, completionHandler: nil)
            
            return ["success": true, "exposure": clamped, "min": minBias, "max": maxBias]
        }
        
        AsyncFunction("setISO") { (iso: Float) in
            guard let device = self.findActiveCamera() else {
                throw NSError(domain: "CameraControls", code: 1, userInfo: [NSLocalizedDescriptionKey: "No active camera found"])
            }
            
            guard device.isExposureModeSupported(.custom) else {
                throw NSError(domain: "CameraControls", code: 2, userInfo: [NSLocalizedDescriptionKey: "Custom exposure not supported"])
            }
            
            try device.lockForConfiguration()
            defer { device.unlockForConfiguration() }
            
            let minISO = device.activeFormat.minISO
            let maxISO = device.activeFormat.maxISO
            let clampedISO = max(minISO, min(maxISO, iso))
            
            device.setExposureModeCustom(
                duration: device.exposureDuration,
                iso: clampedISO,
                completionHandler: nil
            )
            
            return ["success": true, "iso": clampedISO, "min": minISO, "max": maxISO]
        }
        
        AsyncFunction("resetToAuto") {
            guard let device = self.findActiveCamera() else {
                throw NSError(domain: "CameraControls", code: 1, userInfo: [NSLocalizedDescriptionKey: "No active camera found"])
            }
            
            try device.lockForConfiguration()
            defer { device.unlockForConfiguration() }
            
            if device.isExposureModeSupported(.continuousAutoExposure) {
                device.exposureMode = .continuousAutoExposure
            }
            
            if device.isWhiteBalanceModeSupported(.continuousAutoWhiteBalance) {
                device.whiteBalanceMode = .continuousAutoWhiteBalance
            }
            
            return ["success": true]
        }
        
        Function("isAvailable") { () -> Bool in
            return self.findActiveCamera() != nil
        }
        
        Function("getDeviceInfo") { () -> [String: Any] in
            guard let device = self.findActiveCamera() else {
                return ["available": false]
            }
            
            let currentGains = device.deviceWhiteBalanceGains
            let currentTemp = device.temperatureAndTintValues(for: currentGains)
            
            return [
                "available": true,
                "deviceName": device.localizedName,
                "position": device.position == .front ? "front" : "back",
                "minExposureBias": device.minExposureTargetBias,
                "maxExposureBias": device.maxExposureTargetBias,
                "currentExposureBias": device.exposureTargetBias,
                "minISO": device.activeFormat.minISO,
                "maxISO": device.activeFormat.maxISO,
                "currentISO": device.iso,
                "currentTemperature": currentTemp.temperature,
                "currentTint": currentTemp.tint,
                "whiteBalanceMode": self.whiteBalanceModeString(device.whiteBalanceMode),
                "exposureMode": self.exposureModeString(device.exposureMode)
            ]
        }
    }
    
    private func findActiveCamera() -> AVCaptureDevice? {
        let discoverySession = AVCaptureDevice.DiscoverySession(
            deviceTypes: [
                .builtInWideAngleCamera,
                .builtInTelephotoCamera,
                .builtInUltraWideCamera,
                .builtInDualCamera,
                .builtInDualWideCamera,
                .builtInTripleCamera
            ],
            mediaType: .video,
            position: .unspecified
        )
        
        for device in discoverySession.devices {
            do {
                try device.lockForConfiguration()
                device.unlockForConfiguration()
                
                if device.position == .back {
                    return device
                }
            } catch {
                continue
            }
        }
        
        return discoverySession.devices.first
    }
    
    private func normalizeGains(_ gains: AVCaptureDevice.WhiteBalanceGains, for device: AVCaptureDevice) -> AVCaptureDevice.WhiteBalanceGains {
        var normalized = gains
        let maxGain = device.maxWhiteBalanceGain
        
        normalized.redGain = max(1.0, min(maxGain, gains.redGain))
        normalized.greenGain = max(1.0, min(maxGain, gains.greenGain))
        normalized.blueGain = max(1.0, min(maxGain, gains.blueGain))
        
        return normalized
    }
    
    private func whiteBalanceModeString(_ mode: AVCaptureDevice.WhiteBalanceMode) -> String {
        switch mode {
        case .locked: return "locked"
        case .autoWhiteBalance: return "auto"
        case .continuousAutoWhiteBalance: return "continuous"
        @unknown default: return "unknown"
        }
    }
    
    private func exposureModeString(_ mode: AVCaptureDevice.ExposureMode) -> String {
        switch mode {
        case .locked: return "locked"
        case .autoExpose: return "auto"
        case .continuousAutoExposure: return "continuous"
        case .custom: return "custom"
        @unknown default: return "unknown"
        }
    }
}
