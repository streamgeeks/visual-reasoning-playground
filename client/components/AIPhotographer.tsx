import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  TextInput,
  Image,
  ScrollView,
  Modal,
  Alert,
} from "react-native";
import Animated, { 
  FadeIn, 
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  cancelAnimation,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { describeScene, detectObject, MoondreamDetectionResult } from "@/lib/moondream";
import {
  AICapture,
  CustomTrigger,
  TriggerPreset,
  DEFAULT_TRIGGERS,
  getAICaptures,
  saveAICapture,
  deleteAICapture,
  getCustomTriggers,
  saveCustomTrigger,
  deleteCustomTrigger,
  generateId,
} from "@/lib/aiPhotographer";
import {
  detectPresetGestures,
  isPresetTrigger,
} from "@/lib/nativeDetection";

export interface PhotoCapture {
  id: string;
  imageUri: string;
  trigger: string;
  capturedAt: string;
}

export interface DetectionResult {
  triggerName: string;
  box?: {
    x_min: number;
    y_min: number;
    x_max: number;
    y_max: number;
  };
}

interface AIPhotographerProps {
  hasApiKey: boolean;
  getFrame: () => Promise<string | null>;
  apiKey: string;
  onCapture?: (photo: PhotoCapture) => void;
  onDetection?: (result: DetectionResult) => void;
}

const EMOJI_OPTIONS = ["📸", "🎯", "⭐", "🔔", "👀", "🎉", "💡", "🚀"];

export function AIPhotographer({
  hasApiKey,
  getFrame,
  apiKey,
  onCapture,
  onDetection,
}: AIPhotographerProps) {
  const { theme } = useTheme();
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>(["smile"]);
  const [customTriggers, setCustomTriggers] = useState<CustomTrigger[]>([]);
  const [isWatching, setIsWatching] = useState(false);
  const [status, setStatus] = useState<"idle" | "watching" | "detected">("idle");
  const [captures, setCaptures] = useState<AICapture[]>([]);
  const [captureCount, setCaptureCount] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(3);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [newTriggerName, setNewTriggerName] = useState("");
  const [newTriggerPrompt, setNewTriggerPrompt] = useState("");
  const [newTriggerEmoji, setNewTriggerEmoji] = useState("📸");
  const [detectionMode, setDetectionMode] = useState<"fast" | "enhanced">("fast");
  
  const watchingRef = useRef(false);
  const cooldownRef = useRef(false);
  const lastCaptureTimeRef = useRef(0);
  const checkForTriggersRef = useRef<((imageBase64: string) => Promise<DetectionResult | null>) | null>(null);
  
  const statusPulse = useSharedValue(1);
  const flashOpacity = useSharedValue(0);
  
  const statusAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: statusPulse.value }],
    opacity: 0.3 + (statusPulse.value - 0.8) * 3.5,
  }));
  
  const flashAnimatedStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));
  
  React.useEffect(() => {
    if (status === "watching") {
      statusPulse.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 600 }),
          withTiming(0.8, { duration: 600 })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(statusPulse);
      statusPulse.value = withTiming(1, { duration: 200 });
    }
  }, [status]);
  
  const triggerFlash = React.useCallback(() => {
    flashOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(0, { duration: 400 })
    );
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [savedCaptures, savedTriggers] = await Promise.all([
      getAICaptures(),
      getCustomTriggers(),
    ]);
    setCaptures(savedCaptures);
    setCustomTriggers(savedTriggers);
  };

  const allTriggers: TriggerPreset[] = [
    ...DEFAULT_TRIGGERS,
    ...customTriggers.map(t => ({
      id: t.id,
      name: t.name,
      icon: t.icon,
      prompt: t.prompt,
      isCustom: true,
    })),
  ];

  const toggleTrigger = (id: string) => {
    setSelectedTriggers(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter(t => t !== id);
      }
      return [...prev, id];
    });
    Haptics.selectionAsync();
  };

  const checkForTriggers = useCallback(async (imageBase64: string): Promise<DetectionResult | null> => {
    const activeTriggers = allTriggers.filter(t => selectedTriggers.includes(t.id));
    if (activeTriggers.length === 0) return null;
    
    const presetTriggers = activeTriggers.filter(t => isPresetTrigger(t.id));
    const customTriggersList = activeTriggers.filter(t => !isPresetTrigger(t.id));
    
    try {
      if (detectionMode === "enhanced" && apiKey) {
        const triggerNames = activeTriggers.map(t => t.name.toLowerCase());
        const triggerList = triggerNames.join(", ");
        
        console.log(`[AIPhotographer] Enhanced mode - checking via Moondream: ${triggerList}`);
        
        const prompt = `Look at this image carefully. Which ONE of these gestures/expressions is the person CURRENTLY and CLEARLY making: ${triggerList}? 
Only answer with the exact gesture name if you are confident (>80% sure) you see it being performed RIGHT NOW. 
If none are clearly visible or you're not confident, answer "none".
Answer with just the gesture name or "none", nothing else.`;
        
        const result = await describeScene(imageBase64, apiKey, prompt);
        
        if (result.error) {
          console.log(`[AIPhotographer] Moondream error, falling back to on-device:`, result.error);
        } else {
          const answer = result.description.toLowerCase().trim();
          console.log(`[AIPhotographer] Enhanced mode response: "${answer}"`);
          
          if (answer !== "none" && !answer.includes("none")) {
            const matchedTrigger = activeTriggers.find(t => 
              answer.includes(t.name.toLowerCase()) || 
              t.name.toLowerCase().includes(answer.replace(/[^a-z\s]/g, "").trim())
            );
            
            if (matchedTrigger) {
              console.log(`[AIPhotographer] Enhanced mode matched: ${matchedTrigger.name}`);
              
              const detectQuery = matchedTrigger.detectQuery || matchedTrigger.name;
              const detectResult = await detectObject(imageBase64, apiKey, detectQuery);
              if (detectResult.found && detectResult.box) {
                return { triggerName: matchedTrigger.name, box: detectResult.box };
              }
              return { triggerName: matchedTrigger.name };
            }
          }
          return null;
        }
      }
      
      if (presetTriggers.length > 0) {
        const presetIds = presetTriggers.map(t => t.id);
        console.log(`[AIPhotographer] Fast mode - on-device detection for: ${presetIds.join(", ")}`);
        
        const gestureResults = await detectPresetGestures(imageBase64, presetIds);
        
        if (gestureResults.length > 0) {
          const detected = gestureResults[0];
          const matchedTrigger = presetTriggers.find(t => 
            t.id.toLowerCase() === detected.gesture.toLowerCase() ||
            t.name.toLowerCase() === detected.gesture.toLowerCase()
          );
          
          if (matchedTrigger && detected.confidence > 0.6) {
            console.log(`[AIPhotographer] On-device detected: ${matchedTrigger.name} (${(detected.confidence * 100).toFixed(0)}%)`);
            
            if (detected.boundingBox) {
              return {
                triggerName: matchedTrigger.name,
                box: {
                  x_min: detected.boundingBox.x,
                  y_min: detected.boundingBox.y,
                  x_max: detected.boundingBox.x + detected.boundingBox.width,
                  y_max: detected.boundingBox.y + detected.boundingBox.height,
                },
              };
            }
            return { triggerName: matchedTrigger.name };
          }
        }
      }
      
      if (customTriggersList.length > 0 && apiKey) {
        const triggerNames = customTriggersList.map(t => t.name.toLowerCase());
        const triggerList = triggerNames.join(", ");
        
        const prompt = `Look at this image carefully. Which ONE of these gestures/expressions is the person CURRENTLY and CLEARLY making: ${triggerList}? 
Only answer with the exact gesture name if you are confident (>80% sure) you see it being performed RIGHT NOW. 
If none are clearly visible or you're not confident, answer "none".
Answer with just the gesture name or "none", nothing else.`;
        
        const result = await describeScene(imageBase64, apiKey, prompt);
        
        if (result.error) {
          console.log(`[AIPhotographer] Moondream error:`, result.error);
          return null;
        }
        
        const answer = result.description.toLowerCase().trim();
        console.log(`[AIPhotographer] Moondream response: "${answer}"`);
        
        if (answer === "none" || answer.includes("none")) {
          return null;
        }
        
        const matchedTrigger = customTriggersList.find(t => 
          answer.includes(t.name.toLowerCase()) || 
          t.name.toLowerCase().includes(answer.replace(/[^a-z\s]/g, "").trim())
        );
        
        if (!matchedTrigger) {
          console.log(`[AIPhotographer] No custom trigger matched for: "${answer}"`);
          return null;
        }
        
        console.log(`[AIPhotographer] Moondream matched: ${matchedTrigger.name}`);
        
        if (matchedTrigger.detectQuery) {
          const detectResult = await detectObject(imageBase64, apiKey, matchedTrigger.detectQuery);
          if (detectResult.found && detectResult.box) {
            return { triggerName: matchedTrigger.name, box: detectResult.box };
          }
        }
        
        return { triggerName: matchedTrigger.name };
      }
      
      return null;
    } catch (err) {
      console.log(`[AIPhotographer] Error:`, err);
      return null;
    }
  }, [apiKey, allTriggers, selectedTriggers, detectionMode]);

  // Keep ref updated so watchLoop always uses latest checkForTriggers
  useEffect(() => {
    checkForTriggersRef.current = checkForTriggers;
  }, [checkForTriggers]);

  const capturePhoto = useCallback(async (imageUri: string, detection: DetectionResult) => {
    triggerFlash();
    
    const capture: AICapture = {
      id: generateId(),
      imageUri,
      trigger: detection.triggerName,
      capturedAt: new Date().toISOString(),
    };
    
    await saveAICapture(capture);
    setCaptures(prev => [capture, ...prev].slice(0, 100));
    setCaptureCount(prev => prev + 1);
    
    onCapture?.(capture);
    onDetection?.(detection);
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [onCapture, onDetection, triggerFlash]);

  const watchLoop = useCallback(async () => {
    while (watchingRef.current) {
      const now = Date.now();
      const timeSinceLastCapture = now - lastCaptureTimeRef.current;
      const cooldownMs = cooldownSeconds * 1000;
      
      if (cooldownRef.current && timeSinceLastCapture < cooldownMs) {
        await new Promise(r => setTimeout(r, 500));
        continue;
      }
      cooldownRef.current = false;
      
      try {
        setStatus("watching");
        const frame = await getFrame();
        
        if (!frame || !watchingRef.current) {
          await new Promise(r => setTimeout(r, 500));
          continue;
        }
        
        const base64Data = frame.includes(",") ? frame.split(",")[1] : frame;
        const detection = checkForTriggersRef.current 
          ? await checkForTriggersRef.current(base64Data)
          : null;
        
        if (detection && watchingRef.current) {
          setStatus("detected");
          await capturePhoto(frame, detection);
          lastCaptureTimeRef.current = Date.now();
          cooldownRef.current = true;
          await new Promise(r => setTimeout(r, 1000));
        }
      } catch (err) {
        console.log("[AIPhotographer] Loop error:", err);
      }
      
      await new Promise(r => setTimeout(r, 1000));
    }
    
    setStatus("idle");
  }, [getFrame, capturePhoto, cooldownSeconds]);

  const hasOnlyPresetTriggers = selectedTriggers.every(id => isPresetTrigger(id));
  const canStart = selectedTriggers.length > 0 && (hasApiKey || hasOnlyPresetTriggers);

  const startWatching = useCallback(() => {
    if (!canStart) return;
    watchingRef.current = true;
    setIsWatching(true);
    setStatus("watching");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    watchLoop();
  }, [canStart, watchLoop]);

  const stopWatching = useCallback(() => {
    watchingRef.current = false;
    setIsWatching(false);
    setStatus("idle");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleAddTrigger = async () => {
    if (!newTriggerName.trim() || !newTriggerPrompt.trim()) return;
    
    const trigger: CustomTrigger = {
      id: generateId(),
      name: newTriggerName.trim(),
      prompt: `${newTriggerPrompt.trim()} Answer only 'yes' or 'no'.`,
      icon: newTriggerEmoji,
      createdAt: new Date().toISOString(),
    };
    
    await saveCustomTrigger(trigger);
    setCustomTriggers(prev => [...prev, trigger]);
    setSelectedTriggers(prev => [...prev, trigger.id]);
    setNewTriggerName("");
    setNewTriggerPrompt("");
    setNewTriggerEmoji("📸");
    setShowAddModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDeleteTrigger = async (id: string) => {
    Alert.alert("Delete Trigger", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteCustomTrigger(id);
          setCustomTriggers(prev => prev.filter(t => t.id !== id));
          setSelectedTriggers(prev => prev.filter(t => t !== id));
        },
      },
    ]);
  };

  const handleDeleteCapture = async (id: string) => {
    await deleteAICapture(id);
    setCaptures(prev => prev.filter(c => c.id !== id));
  };

  useEffect(() => {
    return () => {
      watchingRef.current = false;
    };
  }, []);



  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.flashOverlay,
          flashAnimatedStyle,
        ]} 
        pointerEvents="none"
      />
      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Triggers</Text>
          <Pressable
            onPress={() => setShowAddModal(true)}
            style={[styles.addButton, { backgroundColor: theme.primary }]}
          >
            <Feather name="plus" size={16} color="#fff" />
          </Pressable>
        </View>
        <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
          Select triggers to watch for
        </Text>
        
        <View style={styles.triggerGrid}>
          {allTriggers.map((trigger) => {
            const isSelected = selectedTriggers.includes(trigger.id);
            return (
              <Pressable
                key={trigger.id}
                onPress={() => toggleTrigger(trigger.id)}
                onLongPress={() => trigger.isCustom && handleDeleteTrigger(trigger.id)}
                style={[
                  styles.triggerPill,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.backgroundSecondary,
                    borderColor: isSelected ? theme.primary : theme.backgroundSecondary,
                  },
                ]}
              >
                <Text style={styles.triggerIcon}>{trigger.icon}</Text>
                <Text style={[
                  styles.triggerName,
                  { color: isSelected ? "#fff" : theme.text },
                ]}>
                  {trigger.name}
                </Text>
                {isPresetTrigger(trigger.id) ? (
                  <Feather name="smartphone" size={12} color={isSelected ? "#fff" : theme.success} />
                ) : (
                  <Feather name="cloud" size={12} color={isSelected ? "#fff" : theme.warning} />
                )}
                {isSelected && (
                  <Feather name="check" size={14} color="#fff" />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.settingsRow}>
          <Text style={[styles.settingLabel, { color: theme.text }]}>
            Detection
          </Text>
          <View style={styles.modeButtons}>
            <Pressable
              onPress={() => setDetectionMode("fast")}
              style={[
                styles.modeButton,
                {
                  backgroundColor: detectionMode === "fast" 
                    ? theme.success 
                    : theme.backgroundSecondary,
                },
              ]}
            >
              <Feather name="smartphone" size={12} color={detectionMode === "fast" ? "#fff" : theme.textSecondary} />
              <Text style={[
                styles.modeButtonText,
                { color: detectionMode === "fast" ? "#fff" : theme.textSecondary },
              ]}>
                Fast
              </Text>
            </Pressable>
            <Pressable
              onPress={() => hasApiKey && setDetectionMode("enhanced")}
              disabled={!hasApiKey}
              style={[
                styles.modeButton,
                {
                  backgroundColor: detectionMode === "enhanced" 
                    ? theme.accent 
                    : theme.backgroundSecondary,
                  opacity: hasApiKey ? 1 : 0.5,
                },
              ]}
            >
              <Feather name="zap" size={12} color={detectionMode === "enhanced" ? "#fff" : theme.textSecondary} />
              <Text style={[
                styles.modeButtonText,
                { color: detectionMode === "enhanced" ? "#fff" : theme.textSecondary },
              ]}>
                Enhanced
              </Text>
            </Pressable>
          </View>
        </View>
        {detectionMode === "enhanced" && (
          <Text style={[styles.modeHint, { color: theme.accent }]}>
            Cloud AI for more reliable detection
          </Text>
        )}
        {!hasApiKey && (
          <Text style={[styles.modeHint, { color: theme.textSecondary }]}>
            Add API key for Enhanced mode
          </Text>
        )}
      </View>

      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.settingsRow}>
          <Text style={[styles.settingLabel, { color: theme.text }]}>
            Cooldown
          </Text>
          <View style={styles.cooldownButtons}>
            {[2, 3, 5, 10].map((sec) => (
              <Pressable
                key={sec}
                onPress={() => setCooldownSeconds(sec)}
                style={[
                  styles.cooldownButton,
                  {
                    backgroundColor: cooldownSeconds === sec 
                      ? theme.primary 
                      : theme.backgroundSecondary,
                  },
                ]}
              >
                <Text style={[
                  styles.cooldownButtonText,
                  { color: cooldownSeconds === sec ? "#fff" : theme.textSecondary },
                ]}>
                  {sec}s
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <View style={[styles.controlSection, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.statusRow}>
          <Animated.View style={[
            styles.statusIndicator,
            {
              backgroundColor: status === "watching" ? theme.warning
                : status === "detected" ? theme.success
                : theme.textSecondary,
            },
            status === "watching" && statusAnimatedStyle,
          ]} />
          <Text style={[styles.statusText, { color: theme.text }]}>
            {status === "idle" && "Ready to watch"}
            {status === "watching" && `Active - watching for ${selectedTriggers.length} trigger${selectedTriggers.length > 1 ? 's' : ''}...`}
            {status === "detected" && "Captured!"}
          </Text>
          {captureCount > 0 && (
            <Pressable 
              onPress={() => setShowGallery(true)}
              style={[styles.countBadge, { backgroundColor: theme.success }]}
            >
              <Text style={styles.countText}>{captureCount}</Text>
              <Feather name="image" size={12} color="#fff" />
            </Pressable>
          )}
        </View>
        
        <Pressable
          onPress={isWatching ? stopWatching : startWatching}
          disabled={!canStart}
          style={({ pressed }) => [
            styles.mainButton,
            {
              backgroundColor: isWatching ? theme.error : theme.success,
              opacity: !canStart ? 0.5 : (pressed ? 0.85 : 1),
            },
          ]}
        >
          <Feather
            name={isWatching ? "stop-circle" : "camera"}
            size={20}
            color="#fff"
          />
          <Text style={styles.mainButtonText}>
            {isWatching ? "Stop" : "Start Watching"}
          </Text>
        </Pressable>
        
        {!hasApiKey && !hasOnlyPresetTriggers && selectedTriggers.length > 0 && (
          <Text style={[styles.apiKeyHint, { color: theme.warning }]}>
            Custom triggers need Moondream API key
          </Text>
        )}
      </View>

      {captures.length > 0 && !showGallery && (
        <Pressable 
          onPress={() => setShowGallery(true)}
          style={[styles.section, { backgroundColor: theme.backgroundDefault }]}
        >
          <View style={styles.galleryPreviewHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Recent Captures
            </Text>
            <Feather name="chevron-right" size={18} color={theme.textSecondary} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {captures.slice(0, 5).map((capture) => (
              <Image
                key={capture.id}
                source={{ uri: capture.imageUri }}
                style={styles.previewThumb}
              />
            ))}
          </ScrollView>
        </Pressable>
      )}

      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              New Trigger
            </Text>
            
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Icon</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiRow}>
              {EMOJI_OPTIONS.map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => setNewTriggerEmoji(emoji)}
                  style={[
                    styles.emojiButton,
                    {
                      backgroundColor: newTriggerEmoji === emoji 
                        ? theme.primary 
                        : theme.backgroundSecondary,
                    },
                  ]}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </Pressable>
              ))}
            </ScrollView>
            
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
              placeholder="e.g., Hand Raise"
              placeholderTextColor={theme.textSecondary}
              value={newTriggerName}
              onChangeText={setNewTriggerName}
            />
            
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
              What to detect
            </Text>
            <TextInput
              style={[styles.input, styles.inputMultiline, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
              placeholder="e.g., Is someone raising their hand?"
              placeholderTextColor={theme.textSecondary}
              value={newTriggerPrompt}
              onChangeText={setNewTriggerPrompt}
              multiline
            />
            
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setShowAddModal(false)}
                style={[styles.modalButton, { backgroundColor: theme.backgroundSecondary }]}
              >
                <Text style={[styles.modalButtonText, { color: theme.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleAddTrigger}
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
              >
                <Text style={[styles.modalButtonText, { color: "#fff" }]}>Add</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showGallery} animationType="slide">
        <View style={[styles.galleryContainer, { backgroundColor: theme.backgroundRoot }]}>
          <View style={[styles.galleryHeader, { backgroundColor: theme.backgroundDefault }]}>
            <Text style={[styles.galleryTitle, { color: theme.text }]}>
              AI Captures ({captures.length})
            </Text>
            <Pressable onPress={() => setShowGallery(false)}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>
          
          {captures.length === 0 ? (
            <View style={styles.emptyGallery}>
              <Feather name="camera-off" size={48} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No captures yet
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.galleryGrid}>
              {captures.map((capture) => (
                <Pressable
                  key={capture.id}
                  onLongPress={() => {
                    Alert.alert("Delete?", "Remove this capture?", [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: () => handleDeleteCapture(capture.id) },
                    ]);
                  }}
                  style={styles.galleryItem}
                >
                  <Image source={{ uri: capture.imageUri }} style={styles.galleryImage} />
                  <View style={[styles.galleryBadge, { backgroundColor: theme.primary }]}>
                    <Text style={styles.galleryBadgeText}>{capture.trigger}</Text>
                  </View>
                  <Text style={[styles.galleryTime, { color: theme.textSecondary }]}>
                    {new Date(capture.capturedAt).toLocaleTimeString()}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#fff",
    zIndex: 100,
  },
  section: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: "600",
  },
  sectionSubtitle: {
    fontSize: Typography.small.fontSize,
    marginBottom: Spacing.md,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  triggerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  triggerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
  },
  triggerIcon: {
    fontSize: 16,
  },
  triggerName: {
    fontSize: Typography.body.fontSize,
    fontWeight: "500",
  },
  settingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingLabel: {
    fontSize: Typography.body.fontSize,
    fontWeight: "500",
  },
  cooldownButtons: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  cooldownButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  cooldownButtonText: {
    fontSize: Typography.small.fontSize,
    fontWeight: "600",
  },
  modeButtons: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  modeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  modeButtonText: {
    fontSize: Typography.small.fontSize,
    fontWeight: "600",
  },
  modeHint: {
    fontSize: Typography.caption.fontSize,
    marginTop: Spacing.xs,
  },
  controlSection: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: Typography.body.fontSize,
    fontWeight: "500",
    flex: 1,
  },
  countBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  countText: {
    color: "#fff",
    fontSize: Typography.small.fontSize,
    fontWeight: "700",
  },
  mainButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  mainButtonText: {
    color: "#fff",
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  apiKeyHint: {
    fontSize: Typography.small.fontSize,
    textAlign: "center",
  },
  galleryPreviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  previewThumb: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.sm,
    backgroundColor: "#000",
  },
  noApiKey: {
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
  },
  noApiKeyTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: "600",
  },
  noApiKeyText: {
    fontSize: Typography.body.fontSize,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  modalTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: "600",
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  inputLabel: {
    fontSize: Typography.small.fontSize,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  input: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    fontSize: Typography.body.fontSize,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  emojiRow: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
  },
  emojiButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.xs,
  },
  emojiText: {
    fontSize: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  modalButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  modalButtonText: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  galleryContainer: {
    flex: 1,
  },
  galleryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    paddingTop: 60,
  },
  galleryTitle: {
    fontSize: Typography.h3.fontSize,
    fontWeight: "600",
  },
  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: Spacing.sm,
  },
  galleryItem: {
    width: "33.33%",
    padding: Spacing.xs,
  },
  galleryImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: BorderRadius.sm,
    backgroundColor: "#000",
  },
  galleryBadge: {
    position: "absolute",
    top: Spacing.sm,
    left: Spacing.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  galleryBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  galleryTime: {
    fontSize: 10,
    marginTop: 2,
    textAlign: "center",
  },
  emptyGallery: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: Typography.body.fontSize,
  },
});
