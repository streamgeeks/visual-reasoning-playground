import ExpoModulesCore
import CoreImage
import UIKit
import Accelerate

struct ColorProfile: Record {
    @Field var red: Double = 0
    @Field var green: Double = 0
    @Field var blue: Double = 0
    @Field var brightness: Double = 0
    @Field var saturation: Double = 0
    @Field var temperature: Double = 0
    @Field var contrast: Double = 0
}

struct ColorCorrection: Record {
    @Field var brightness: Int = 7
    @Field var saturation: Int = 7
    @Field var contrast: Int = 7
    @Field var hue: Int = 7
    @Field var redGain: Int = 128
    @Field var blueGain: Int = 128
    @Field var colorTemperature: Int = 21
    @Field var whiteBalanceMode: String = "auto"
}

struct ComparisonResult: Record {
    @Field var similarity: Double = 0
    @Field var brightnessDelta: Double = 0
    @Field var saturationDelta: Double = 0
    @Field var temperatureDelta: Double = 0
    @Field var contrastDelta: Double = 0
    @Field var correction: ColorCorrection = ColorCorrection()
}

public class ColorAnalysisModule: Module {
    private let context = CIContext(options: [.workingColorSpace: NSNull()])
    
    public func definition() -> ModuleDefinition {
        Name("ColorAnalysis")
        
        AsyncFunction("analyzeImage") { (imageBase64: String) -> ColorProfile in
            guard let image = self.imageFromBase64(imageBase64) else {
                throw NSError(domain: "ColorAnalysis", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid image data"])
            }
            return self.analyzeColorProfile(image: image)
        }
        
        AsyncFunction("compareImages") { (currentBase64: String, referenceBase64: String) -> ComparisonResult in
            guard let currentImage = self.imageFromBase64(currentBase64),
                  let referenceImage = self.imageFromBase64(referenceBase64) else {
                throw NSError(domain: "ColorAnalysis", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid image data"])
            }
            
            let currentProfile = self.analyzeColorProfile(image: currentImage)
            let referenceProfile = self.analyzeColorProfile(image: referenceImage)
            
            return self.compareProfiles(current: currentProfile, reference: referenceProfile)
        }
        
        AsyncFunction("generateCorrection") { (currentBase64: String, referenceBase64: String) -> ColorCorrection in
            guard let currentImage = self.imageFromBase64(currentBase64),
                  let referenceImage = self.imageFromBase64(referenceBase64) else {
                throw NSError(domain: "ColorAnalysis", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid image data"])
            }
            
            let currentProfile = self.analyzeColorProfile(image: currentImage)
            let referenceProfile = self.analyzeColorProfile(image: referenceImage)
            let comparison = self.compareProfiles(current: currentProfile, reference: referenceProfile)
            
            return comparison.correction
        }
        
        Function("isAvailable") { () -> Bool in
            return true
        }
    }
    
    private func imageFromBase64(_ base64String: String) -> CIImage? {
        let base64Data: String
        if base64String.contains(",") {
            base64Data = String(base64String.split(separator: ",").last ?? "")
        } else {
            base64Data = base64String
        }
        
        guard let imageData = Data(base64Encoded: base64Data) else {
            return nil
        }
        
        return CIImage(data: imageData)
    }
    
    private func analyzeColorProfile(image: CIImage) -> ColorProfile {
        var profile = ColorProfile()
        
        let avgColor = calculateAverageColor(image: image)
        profile.red = avgColor.red
        profile.green = avgColor.green
        profile.blue = avgColor.blue
        
        profile.brightness = calculateBrightness(r: avgColor.red, g: avgColor.green, b: avgColor.blue)
        profile.saturation = calculateSaturation(r: avgColor.red, g: avgColor.green, b: avgColor.blue)
        profile.temperature = estimateColorTemperature(r: avgColor.red, g: avgColor.green, b: avgColor.blue)
        profile.contrast = calculateContrast(image: image)
        
        return profile
    }
    
    private func calculateAverageColor(image: CIImage) -> (red: Double, green: Double, blue: Double) {
        let extentVector = CIVector(
            x: image.extent.origin.x,
            y: image.extent.origin.y,
            z: image.extent.size.width,
            w: image.extent.size.height
        )
        
        guard let filter = CIFilter(name: "CIAreaAverage", parameters: [
            kCIInputImageKey: image,
            kCIInputExtentKey: extentVector
        ]),
        let outputImage = filter.outputImage else {
            return (0.5, 0.5, 0.5)
        }
        
        var bitmap = [UInt8](repeating: 0, count: 4)
        context.render(
            outputImage,
            toBitmap: &bitmap,
            rowBytes: 4,
            bounds: CGRect(x: 0, y: 0, width: 1, height: 1),
            format: .RGBA8,
            colorSpace: nil
        )
        
        return (
            red: Double(bitmap[0]) / 255.0,
            green: Double(bitmap[1]) / 255.0,
            blue: Double(bitmap[2]) / 255.0
        )
    }
    
    private func calculateBrightness(r: Double, g: Double, b: Double) -> Double {
        return 0.299 * r + 0.587 * g + 0.114 * b
    }
    
    private func calculateSaturation(r: Double, g: Double, b: Double) -> Double {
        let maxVal = max(r, g, b)
        let minVal = min(r, g, b)
        let delta = maxVal - minVal
        
        if maxVal == 0 {
            return 0
        }
        
        return delta / maxVal
    }
    
    private func estimateColorTemperature(r: Double, g: Double, b: Double) -> Double {
        let blueRatio = b / (r + 0.001)
        return min(max(blueRatio, 0), 2)
    }
    
    private func calculateContrast(image: CIImage) -> Double {
        let scaledImage = image.transformed(by: CGAffineTransform(scaleX: 0.1, y: 0.1))
        
        guard let cgImage = context.createCGImage(scaledImage, from: scaledImage.extent) else {
            return 0.5
        }
        
        let width = cgImage.width
        let height = cgImage.height
        let bytesPerPixel = 4
        let bytesPerRow = bytesPerPixel * width
        
        var pixelData = [UInt8](repeating: 0, count: width * height * bytesPerPixel)
        
        guard let colorSpace = CGColorSpace(name: CGColorSpace.sRGB),
              let contextRef = CGContext(
                data: &pixelData,
                width: width,
                height: height,
                bitsPerComponent: 8,
                bytesPerRow: bytesPerRow,
                space: colorSpace,
                bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
              ) else {
            return 0.5
        }
        
        contextRef.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
        
        var luminances: [Double] = []
        for i in stride(from: 0, to: pixelData.count, by: bytesPerPixel) {
            let r = Double(pixelData[i]) / 255.0
            let g = Double(pixelData[i + 1]) / 255.0
            let b = Double(pixelData[i + 2]) / 255.0
            let lum = 0.299 * r + 0.587 * g + 0.114 * b
            luminances.append(lum)
        }
        
        guard !luminances.isEmpty else { return 0.5 }
        
        let mean = luminances.reduce(0, +) / Double(luminances.count)
        let variance = luminances.map { pow($0 - mean, 2) }.reduce(0, +) / Double(luminances.count)
        let stdDev = sqrt(variance)
        
        return min(stdDev * 4, 1.0)
    }
    
    private func compareProfiles(current: ColorProfile, reference: ColorProfile) -> ComparisonResult {
        var result = ComparisonResult()
        
        let brightnessDelta = reference.brightness - current.brightness
        let saturationDelta = reference.saturation - current.saturation
        let temperatureDelta = reference.temperature - current.temperature
        let contrastDelta = reference.contrast - current.contrast
        
        result.brightnessDelta = brightnessDelta
        result.saturationDelta = saturationDelta
        result.temperatureDelta = temperatureDelta
        result.contrastDelta = contrastDelta
        
        let colorDist = sqrt(
            pow(reference.red - current.red, 2) +
            pow(reference.green - current.green, 2) +
            pow(reference.blue - current.blue, 2)
        )
        let maxDist = sqrt(3.0)
        result.similarity = 1.0 - (colorDist / maxDist)
        
        var correction = ColorCorrection()
        
        correction.brightness = 7 + Int(brightnessDelta * 14)
        correction.brightness = max(0, min(14, correction.brightness))
        
        correction.saturation = 7 + Int(saturationDelta * 14)
        correction.saturation = max(0, min(14, correction.saturation))
        
        correction.contrast = 7 + Int(contrastDelta * 7)
        correction.contrast = max(0, min(14, correction.contrast))
        
        if temperatureDelta > 0.1 {
            correction.blueGain = 128 + Int(temperatureDelta * 60)
            correction.redGain = 128 - Int(temperatureDelta * 30)
            correction.whiteBalanceMode = "manual"
        } else if temperatureDelta < -0.1 {
            correction.redGain = 128 + Int(abs(temperatureDelta) * 60)
            correction.blueGain = 128 - Int(abs(temperatureDelta) * 30)
            correction.whiteBalanceMode = "manual"
        }
        
        correction.redGain = max(0, min(255, correction.redGain))
        correction.blueGain = max(0, min(255, correction.blueGain))
        
        let tempIndex = Int(21 + temperatureDelta * 15)
        correction.colorTemperature = max(0, min(37, tempIndex))
        
        result.correction = correction
        
        return result
    }
}
