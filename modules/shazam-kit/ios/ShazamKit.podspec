Pod::Spec.new do |s|
  s.name           = 'ShazamKit'
  s.version        = '1.0.0'
  s.summary        = 'ShazamKit module for Visual Reasoning'
  s.description    = 'Native ShazamKit integration for music detection and camera automation'
  s.author         = 'Visual Reasoning'
  s.homepage       = 'https://github.com/visual-reasoning'
  s.platforms      = { :ios => '15.0' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = '*.swift'
  s.frameworks = 'ShazamKit', 'AVFAudio', 'Accelerate'
end
