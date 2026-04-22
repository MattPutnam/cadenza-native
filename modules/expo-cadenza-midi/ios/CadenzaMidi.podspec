Pod::Spec.new do |s|
  s.name           = 'CadenzaMidi'
  s.version        = '1.0.0'
  s.summary        = 'Cadenza MIDI native module (CoreMIDI bridge).'
  s.description    = 'Local Expo module exposing platform MIDI input as events to JavaScript.'
  s.author         = ''
  s.homepage       = 'https://cadenza.local'
  s.platforms      = { :ios => '15.1', :tvos => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.license        = 'MIT'

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.frameworks = 'CoreMIDI'

  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end
