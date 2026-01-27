import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  cancelAnimation,
} from "react-native-reanimated";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { CameraProfile } from "@/lib/storage";
import {
  processUserInputWithFrame,
  getSuggestedPrompts,
  getNativeCameraQuickActions,
  getPtzQuickActions,
  AIResponse,
  FollowUpOption,
  cancelActiveTracking,
  isTrackingActive,
} from "@/lib/cameraAI";
import {
  InlineAction,
  parseMessageForActions,
  getWelcomeMessage,
  conversationMemory,
  isRepeatableCommand,
} from "@/lib/chatPersonality";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUri?: string;
  timestamp: Date;
  source?: "vision" | "moondream";
  followUpOptions?: FollowUpOption[];
  inlineActions?: InlineAction[];
}

export interface ChatDetection {
  label: string;
  box: { x: number; y: number; width: number; height: number };
  confidence: number;
  color?: string;
}

const DETECTION_COLORS = [
  "#007AFF",
  "#34C759",
  "#FF9500",
  "#FF3B30",
  "#9b59b6",
  "#1abc9c",
  "#e67e22",
  "#3498db",
  "#AF52DE",
  "#5AC8FA",
  "#FF2D55",
  "#64D2FF",
];

function TypingDot({ delay, color }: { delay: number; color: string }) {
  const translateY = useSharedValue(0);

  React.useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 300 }),
          withTiming(0, { duration: 300 }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        { width: 8, height: 8, borderRadius: 4, backgroundColor: color },
        animatedStyle,
      ]}
    />
  );
}

interface CameraChatProps {
  camera: CameraProfile | null;
  apiKey: string;
  isConnected: boolean;
  getFrame?: () => Promise<string | null>;
  ptzConnected?: boolean;
  onConnectPtz?: () => void;
  onShowDetections?: (detections: ChatDetection[], detectType: string) => void;
  onAdjustCamera?: (setting: string, direction: string) => void;
  detections?: ChatDetection[];
  visibleLabels?: Set<string>;
  onToggleDetection?: (label: string) => void;
}

export function CameraChat({
  camera,
  apiKey,
  isConnected,
  getFrame,
  ptzConnected,
  onConnectPtz,
  onShowDetections,
  onAdjustCamera,
  detections,
  visibleLabels,
  onToggleDetection,
}: CameraChatProps) {
  const { theme } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);

  const hasApiKey = Boolean(apiKey);
  const cameraSourceLabel =
    ptzConnected && camera ? camera.name : "Device Camera";

  const welcomeData = getWelcomeMessage(ptzConnected ?? false, hasApiKey);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: welcomeData.message,
      timestamp: new Date(),
      inlineActions: welcomeData.inlineActions,
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [voiceFeedbackEnabled, setVoiceFeedbackEnabled] = useState(true);
  const [continuousMode, setContinuousMode] = useState(false);
  const [showVoiceHelp, setShowVoiceHelp] = useState(false);
  const [showCameraControls, setShowCameraControls] = useState(false);
  const [activeProcess, setActiveProcess] = useState<{
    type: string;
    name: string;
  } | null>(null);

  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(1);
  const startVoiceInputRef = useRef<() => void>(() => {});

  const suggestions = getSuggestedPrompts(ptzConnected);
  const quickActionsList = ptzConnected
    ? getPtzQuickActions()
    : getNativeCameraQuickActions();

  useSpeechRecognitionEvent("start", () => {
    setIsListening(true);
    setInterimTranscript("");
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 500 }),
        withTiming(1, { duration: 500 }),
      ),
      -1,
      true,
    );
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 500 }),
        withTiming(1, { duration: 500 }),
      ),
      -1,
      true,
    );
  });

  useSpeechRecognitionEvent("end", () => {
    setIsListening(false);
    cancelAnimation(pulseScale);
    cancelAnimation(pulseOpacity);
    pulseScale.value = withTiming(1, { duration: 200 });
    pulseOpacity.value = withTiming(1, { duration: 200 });
  });

  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results[0]?.transcript || "";
    const isFinal = event.isFinal;

    if (isFinal && transcript.trim()) {
      setInterimTranscript("");
      setInputText(transcript);
      handleSend(transcript);
    } else {
      setInterimTranscript(transcript);
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    console.log("[VoiceInput] Error:", event.error, event.message);
    setIsListening(false);
    setInterimTranscript("");
    cancelAnimation(pulseScale);
    cancelAnimation(pulseOpacity);
    pulseScale.value = 1;
    pulseOpacity.value = 1;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  });

  const pulsingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const speakResponse = useCallback(
    (text: string) => {
      if (!voiceFeedbackEnabled) return;

      Speech.stop();
      Speech.speak(text, {
        language: "en-US",
        pitch: 1.0,
        rate: 0.9,
        onDone: () => {
          if (continuousMode && !isProcessing) {
            setTimeout(() => {
              startVoiceInputRef.current();
            }, 300);
          }
        },
      });
    },
    [voiceFeedbackEnabled, continuousMode, isProcessing],
  );

  type QuickActionItem = {
    label: string;
    icon: keyof typeof Feather.glyphMap;
    command?: string;
    action?: "help" | "camera-controls";
  };

  const quickActions: QuickActionItem[] = [
    { label: "Controls", icon: "sliders", action: "camera-controls" },
    ...quickActionsList.map((q) => ({
      label: q.label,
      icon: q.icon as keyof typeof Feather.glyphMap,
      command: q.command,
    })),
    { label: "Voice help", icon: "help-circle", action: "help" },
  ];

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSend = useCallback(
    async (text?: string) => {
      const messageText = text || inputText.trim();
      if (!messageText || isProcessing) return;

      setInputText("");
      setShowSuggestions(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: messageText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsProcessing(true);

      const isTrackingCommand =
        /track|zoom\s+(in\s+)?(on|into|to)|focus\s+(on|in)|center\s+on|follow/i.test(
          messageText,
        );
      if (isTrackingCommand) {
        const objectMatch = messageText.match(
          /(?:track|zoom\s+(?:in\s+)?(?:on|into|to)|focus\s+(?:on|in)|center\s+on|follow)\s+(?:the\s+)?(.+)/i,
        );
        const objectName = objectMatch?.[1]?.trim() || "object";
        setActiveProcess({ type: "tracking", name: objectName });
      }

      try {
        const response = await processUserInputWithFrame(
          messageText,
          camera,
          apiKey,
          getFrame,
        );

        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: response.message,
          imageUri: response.imageUri,
          timestamp: new Date(),
          source: response.source,
          followUpOptions: response.followUpOptions,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setActiveProcess(null);

        if (
          response.action === "moved_camera" ||
          response.action === "found_object"
        ) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        if (
          response.action === "show_detections" &&
          response.detections &&
          onShowDetections
        ) {
          const chatDetections = response.detections.map((d) => ({
            label: d.label,
            box: d.box,
            confidence: d.confidence,
          }));
          onShowDetections(
            chatDetections,
            response.detectType || "all_objects",
          );
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        if (response.action === "adjusted_camera" && onAdjustCamera) {
          onAdjustCamera("setting", "adjusted");
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        speakResponse(response.message);
      } catch (err) {
        console.error("[CameraChat] Error processing message:", err);
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Sorry, I encountered an error processing your request.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        setActiveProcess(null);
      } finally {
        setIsProcessing(false);
      }
    },
    [inputText, isProcessing, camera, apiKey, getFrame, speakResponse],
  );

  const handleSuggestionPress = (suggestion: string) => {
    handleSend(suggestion);
  };

  const handleCancelActiveProcess = useCallback(() => {
    cancelActiveTracking();
    setActiveProcess(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    const cancelMessage: Message = {
      id: `system-${Date.now()}`,
      role: "assistant",
      content: "Process cancelled.",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, cancelMessage]);
  }, []);

  const handleFollowUp = useCallback(
    (command: string) => {
      handleSend(command);
    },
    [handleSend],
  );

  const handleQuickAction = useCallback(
    async (command: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      try {
        await processUserInputWithFrame(command, camera, apiKey, getFrame);
      } catch (err) {
        console.log("[QuickAction] Error:", err);
      }
    },
    [camera, apiKey, getFrame],
  );

  const handleVoiceInput = useCallback(async () => {
    if (isListening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }

    try {
      Speech.stop();

      const result =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        console.warn("[VoiceInput] Permissions not granted:", result);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: true,
        continuous: false,
        requiresOnDeviceRecognition: Platform.OS === "ios",
        addsPunctuation: true,
      });
    } catch (err) {
      console.error("[VoiceInput] Failed to start:", err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [isListening]);

  startVoiceInputRef.current = handleVoiceInput;

  const renderMessageWithDetections = useCallback(
    (text: string, isAssistant: boolean) => {
      if (!isAssistant) {
        return (
          <Text style={[styles.messageText, { color: "#fff" }]}>{text}</Text>
        );
      }

      const labelColorMap = new Map<string, string>();
      if (detections && detections.length > 0) {
        detections.forEach((d, i) => {
          labelColorMap.set(
            d.label.toLowerCase(),
            d.color || DETECTION_COLORS[i % DETECTION_COLORS.length],
          );
        });
      }

      const detectionLabels = detections?.map((d) => d.label) || [];
      const segments = parseMessageForActions(
        text,
        ptzConnected ?? false,
        detectionLabels,
        labelColorMap,
      );

      return (
        <Text style={[styles.messageText, { color: theme.text }]}>
          {segments.map((seg, i) => {
            if (seg.type === "text") {
              return <Text key={i}>{seg.content}</Text>;
            }

            if (seg.type === "action") {
              return (
                <Text
                  key={i}
                  onPress={() => {
                    if (seg.command) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      handleSend(seg.command);
                    }
                  }}
                  style={[
                    styles.actionWord,
                    { color: seg.color, backgroundColor: seg.color + "20" },
                  ]}
                >
                  {seg.content}
                </Text>
              );
            }

            if (seg.type === "detection") {
              const isVisible = visibleLabels?.has(seg.content.toLowerCase());
              return (
                <Text
                  key={i}
                  onPress={() => {
                    if (onToggleDetection) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onToggleDetection(seg.content.toLowerCase());
                    }
                  }}
                  style={[
                    styles.detectableWord,
                    {
                      color: seg.color,
                      backgroundColor: isVisible
                        ? seg.color + "25"
                        : "transparent",
                      textDecorationLine: isVisible ? "none" : "line-through",
                      opacity: isVisible ? 1 : 0.6,
                    },
                  ]}
                >
                  {seg.content}
                </Text>
              );
            }

            return <Text key={i}>{seg.content}</Text>;
          })}
        </Text>
      );
    },
    [
      detections,
      visibleLabels,
      onToggleDetection,
      theme.text,
      ptzConnected,
      handleSend,
    ],
  );

  const renderMessage = (message: Message, index: number) => {
    const isUser = message.role === "user";

    return (
      <Animated.View
        key={message.id}
        entering={FadeInDown.delay(index * 50).springify()}
        style={[
          styles.messageContainer,
          isUser
            ? styles.userMessageContainer
            : styles.assistantMessageContainer,
        ]}
      >
        {!isUser && (
          <View
            style={[
              styles.avatarContainer,
              { backgroundColor: theme.primary + "20" },
            ]}
          >
            <Feather name="camera" size={16} color={theme.primary} />
          </View>
        )}

        <View
          style={[
            styles.messageBubble,
            isUser
              ? [styles.userBubble, { backgroundColor: theme.primary }]
              : [
                  styles.assistantBubble,
                  { backgroundColor: theme.backgroundDefault },
                ],
          ]}
        >
          {message.imageUri && (
            <Image
              source={{ uri: message.imageUri }}
              style={styles.messageImage}
              contentFit="cover"
            />
          )}
          {isUser ? (
            <Text style={[styles.messageText, { color: "#fff" }]}>
              {message.content}
            </Text>
          ) : (
            renderMessageWithDetections(message.content, true)
          )}
          {!isUser && message.source && (
            <View
              style={[
                styles.sourceBadge,
                {
                  backgroundColor:
                    message.source === "vision"
                      ? theme.success + "20"
                      : theme.primary + "20",
                },
              ]}
            >
              <Feather
                name={message.source === "vision" ? "zap" : "cpu"}
                size={10}
                color={
                  message.source === "vision" ? theme.success : theme.primary
                }
              />
              <Text
                style={[
                  styles.sourceBadgeText,
                  {
                    color:
                      message.source === "vision"
                        ? theme.success
                        : theme.primary,
                  },
                ]}
              >
                {message.source === "vision" ? "Vision" : "Moondream"}
              </Text>
            </View>
          )}
          {!isUser &&
            message.followUpOptions &&
            message.followUpOptions.length > 0 && (
              <View style={styles.followUpContainer}>
                {message.followUpOptions.map((option, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => handleFollowUp(option.command)}
                    style={({ pressed }) => [
                      styles.followUpButton,
                      {
                        backgroundColor: theme.primary + "15",
                        borderColor: theme.primary + "40",
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Feather
                      name={
                        option.amount === "little"
                          ? "chevrons-right"
                          : "fast-forward"
                      }
                      size={12}
                      color={theme.primary}
                    />
                    <Text
                      style={[styles.followUpText, { color: theme.primary }]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          {!isUser &&
            message.inlineActions &&
            message.inlineActions.length > 0 && (
              <View style={styles.inlineActionsContainer}>
                {message.inlineActions.map((action, idx) => {
                  const isRepeatable = action.actionType === "repeatable";
                  return (
                    <Pressable
                      key={idx}
                      onPress={() => {
                        if (isRepeatable) {
                          handleQuickAction(action.command);
                        } else {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light,
                          );
                          handleSend(action.command);
                        }
                      }}
                      style={({ pressed }) => [
                        isRepeatable
                          ? styles.repeatableActionButton
                          : styles.inlineActionButton,
                        {
                          backgroundColor: pressed
                            ? action.color + "40"
                            : action.color + "20",
                          borderColor: action.color + "60",
                          transform: [{ scale: pressed ? 0.95 : 1 }],
                        },
                      ]}
                    >
                      {isRepeatable && (
                        <Feather
                          name="repeat"
                          size={10}
                          color={action.color}
                          style={{ marginRight: 4 }}
                        />
                      )}
                      <Text
                        style={[
                          styles.inlineActionText,
                          { color: action.color },
                        ]}
                      >
                        {action.text}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
        </View>

        {isUser && (
          <View
            style={[
              styles.avatarContainer,
              { backgroundColor: theme.textSecondary + "20" },
            ]}
          >
            <Feather name="user" size={16} color={theme.textSecondary} />
          </View>
        )}
      </Animated.View>
    );
  };

  if (!isConnected) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Feather name="wifi-off" size={48} color={theme.textSecondary} />
        <Text style={[styles.disconnectedText, { color: theme.textSecondary }]}>
          Connect to a camera to start chatting
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={100}
    >
      <View
        style={[styles.sourceBar, { backgroundColor: theme.backgroundDefault }]}
      >
        <View style={styles.sourceBarLeft}>
          <Feather
            name={ptzConnected ? "video" : "smartphone"}
            size={14}
            color={ptzConnected ? theme.success : theme.primary}
          />
          <Text style={[styles.sourceBarText, { color: theme.text }]}>
            {cameraSourceLabel}
          </Text>
          {hasApiKey && (
            <View
              style={[
                styles.aiIndicator,
                { backgroundColor: theme.primary + "20" },
              ]}
            >
              <Text style={[styles.aiIndicatorText, { color: theme.primary }]}>
                AI
              </Text>
            </View>
          )}
        </View>
        {!ptzConnected && camera && onConnectPtz && (
          <Pressable
            onPress={onConnectPtz}
            style={[
              styles.connectPtzButton,
              { backgroundColor: theme.success },
            ]}
          >
            <Feather name="link" size={12} color="#fff" />
            <Text style={styles.connectPtzText}>PTZ</Text>
          </Pressable>
        )}
      </View>

      {activeProcess && (
        <Animated.View
          entering={FadeIn}
          style={[
            styles.activeProcessBar,
            { backgroundColor: theme.warning + "20" },
          ]}
        >
          <View style={styles.activeProcessInfo}>
            <ActivityIndicator size="small" color={theme.warning} />
            <Text style={[styles.activeProcessText, { color: theme.warning }]}>
              {activeProcess.type === "tracking"
                ? `Tracking "${activeProcess.name}"...`
                : "Processing..."}
            </Text>
          </View>
          <Pressable
            onPress={handleCancelActiveProcess}
            style={({ pressed }) => [
              styles.cancelProcessButton,
              { backgroundColor: theme.error, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Feather name="x" size={14} color="#fff" />
            <Text style={styles.cancelProcessText}>Stop</Text>
          </Pressable>
        </Animated.View>
      )}

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message, index) => renderMessage(message, index))}

        {isProcessing && (
          <Animated.View
            entering={FadeIn}
            style={[styles.messageContainer, styles.assistantMessageContainer]}
          >
            <View
              style={[
                styles.avatarContainer,
                { backgroundColor: theme.primary + "20" },
              ]}
            >
              <Feather name="camera" size={16} color={theme.primary} />
            </View>
            <View
              style={[
                styles.messageBubble,
                styles.assistantBubble,
                { backgroundColor: theme.backgroundDefault },
              ]}
            >
              <View style={styles.typingIndicator}>
                <View style={styles.typingDots}>
                  <TypingDot delay={0} color={theme.primary} />
                  <TypingDot delay={150} color={theme.primary} />
                  <TypingDot delay={300} color={theme.primary} />
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {showSuggestions && messages.length === 1 && (
          <Animated.View
            entering={FadeIn.delay(300)}
            style={styles.suggestionsContainer}
          >
            <Text
              style={[styles.suggestionsTitle, { color: theme.textSecondary }]}
            >
              Try asking:
            </Text>
            <View style={styles.suggestionsGrid}>
              {suggestions.slice(0, 6).map((suggestion, index) => (
                <Pressable
                  key={index}
                  onPress={() => handleSuggestionPress(suggestion)}
                  style={[
                    styles.suggestionChip,
                    { backgroundColor: theme.backgroundDefault },
                  ]}
                >
                  <Text style={[styles.suggestionText, { color: theme.text }]}>
                    {suggestion}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>

      <View
        style={[
          styles.quickActionsContainer,
          { backgroundColor: theme.backgroundDefault },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActionsScroll}
        >
          {quickActions.map((action, index) => {
            const isHelpAction = action.action === "help";
            const isHelpActive = isHelpAction && showVoiceHelp;

            return (
              <Pressable
                key={index}
                onPress={() => {
                  if (isHelpAction) {
                    setShowVoiceHelp(!showVoiceHelp);
                    setShowCameraControls(false);
                  } else if (action.action === "camera-controls") {
                    setShowCameraControls(!showCameraControls);
                    setShowVoiceHelp(false);
                  } else {
                    handleSend(action.command || action.label);
                  }
                }}
                disabled={
                  isProcessing &&
                  !isHelpAction &&
                  action.action !== "camera-controls"
                }
                style={[
                  styles.quickActionButton,
                  {
                    backgroundColor: isHelpActive
                      ? theme.primary
                      : action.action === "camera-controls" &&
                          showCameraControls
                        ? theme.primary
                        : theme.backgroundSecondary,
                    opacity:
                      isProcessing &&
                      !isHelpAction &&
                      action.action !== "camera-controls"
                        ? 0.5
                        : 1,
                  },
                ]}
              >
                <Feather
                  name={action.icon}
                  size={14}
                  color={
                    isHelpActive ||
                    (action.action === "camera-controls" && showCameraControls)
                      ? "#fff"
                      : theme.primary
                  }
                />
                <Text
                  style={[
                    styles.quickActionText,
                    {
                      color:
                        isHelpActive ||
                        (action.action === "camera-controls" &&
                          showCameraControls)
                          ? "#fff"
                          : theme.text,
                    },
                  ]}
                >
                  {action.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {showVoiceHelp && (
        <Animated.View
          entering={FadeIn}
          style={[
            styles.voiceHelpPanel,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <View style={styles.voiceHelpHeader}>
            <Text style={[styles.voiceHelpTitle, { color: theme.text }]}>
              Voice Commands
            </Text>
            <Pressable onPress={() => setShowVoiceHelp(false)}>
              <Feather name="x" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>

          {ptzConnected && (
            <View style={styles.voiceHelpSection}>
              <Text
                style={[styles.voiceHelpCategory, { color: theme.primary }]}
              >
                Camera Control
              </Text>
              <Text
                style={[
                  styles.voiceHelpCommand,
                  { color: theme.textSecondary },
                ]}
              >
                "Pan left/right" • "Tilt up/down" • "Zoom in/out" • "Go home"
              </Text>
            </View>
          )}

          <View style={styles.voiceHelpSection}>
            <Text style={[styles.voiceHelpCategory, { color: theme.primary }]}>
              Vision
            </Text>
            <Text
              style={[styles.voiceHelpCommand, { color: theme.textSecondary }]}
            >
              "What do you see?" • "How many people?" • "Describe the scene"
            </Text>
          </View>

          {ptzConnected && (
            <>
              <View style={styles.voiceHelpSection}>
                <Text
                  style={[styles.voiceHelpCategory, { color: theme.primary }]}
                >
                  Search
                </Text>
                <Text
                  style={[
                    styles.voiceHelpCommand,
                    { color: theme.textSecondary },
                  ]}
                >
                  "Find the [object]" • "Look for [item]" • "Where is the
                  [thing]?"
                </Text>
              </View>

              <View style={styles.voiceHelpSection}>
                <Text
                  style={[styles.voiceHelpCategory, { color: theme.primary }]}
                >
                  Track & Zoom
                </Text>
                <Text
                  style={[
                    styles.voiceHelpCommand,
                    { color: theme.textSecondary },
                  ]}
                >
                  "Zoom into the guitar" • "Focus on that person" • "Track the
                  plant"
                </Text>
              </View>
            </>
          )}

          {!ptzConnected && (
            <View style={styles.voiceHelpSection}>
              <Text
                style={[styles.voiceHelpCategory, { color: theme.primary }]}
              >
                Analysis
              </Text>
              <Text
                style={[
                  styles.voiceHelpCommand,
                  { color: theme.textSecondary },
                ]}
              >
                "Any activity?" • "Count faces" • "What gestures?" • "Anyone
                there?"
              </Text>
            </View>
          )}

          <View style={styles.voiceToggleRow}>
            <View style={styles.voiceToggleItem}>
              <Pressable
                onPress={() => setVoiceFeedbackEnabled(!voiceFeedbackEnabled)}
                style={[
                  styles.voiceToggleButton,
                  {
                    backgroundColor: voiceFeedbackEnabled
                      ? theme.success
                      : theme.backgroundDefault,
                  },
                ]}
              >
                <Feather
                  name="volume-2"
                  size={14}
                  color={voiceFeedbackEnabled ? "#fff" : theme.textSecondary}
                />
              </Pressable>
              <Text
                style={[
                  styles.voiceToggleLabel,
                  { color: theme.textSecondary },
                ]}
              >
                Speak responses
              </Text>
            </View>

            <View style={styles.voiceToggleItem}>
              <Pressable
                onPress={() => setContinuousMode(!continuousMode)}
                style={[
                  styles.voiceToggleButton,
                  {
                    backgroundColor: continuousMode
                      ? theme.success
                      : theme.backgroundDefault,
                  },
                ]}
              >
                <Feather
                  name="repeat"
                  size={14}
                  color={continuousMode ? "#fff" : theme.textSecondary}
                />
              </Pressable>
              <Text
                style={[
                  styles.voiceToggleLabel,
                  { color: theme.textSecondary },
                ]}
              >
                Continuous
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      {showCameraControls && (
        <Animated.View
          entering={FadeIn}
          style={[
            styles.cameraControlsPanel,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <View style={styles.cameraControlsHeader}>
            <Text style={[styles.cameraControlsTitle, { color: theme.text }]}>
              {ptzConnected ? "PTZ Camera Controls" : "Camera Controls"}
            </Text>
            <Pressable onPress={() => setShowCameraControls(false)}>
              <Feather name="x" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>

          {ptzConnected ? (
            <>
              <View style={styles.controlSection}>
                <Text
                  style={[styles.controlSectionTitle, { color: theme.primary }]}
                >
                  Pan & Tilt
                </Text>
                <View style={styles.dpadContainer}>
                  <View style={styles.dpadRow}>
                    <View style={styles.dpadSpacer} />
                    <Pressable
                      onPress={() => handleSend("Tilt up")}
                      style={[
                        styles.dpadButton,
                        { backgroundColor: theme.backgroundDefault },
                      ]}
                    >
                      <Feather
                        name="chevron-up"
                        size={20}
                        color={theme.primary}
                      />
                    </Pressable>
                    <View style={styles.dpadSpacer} />
                  </View>
                  <View style={styles.dpadRow}>
                    <Pressable
                      onPress={() => handleSend("Pan left")}
                      style={[
                        styles.dpadButton,
                        { backgroundColor: theme.backgroundDefault },
                      ]}
                    >
                      <Feather
                        name="chevron-left"
                        size={20}
                        color={theme.primary}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => handleSend("Go home")}
                      style={[
                        styles.dpadButton,
                        styles.dpadCenter,
                        { backgroundColor: theme.primary },
                      ]}
                    >
                      <Feather name="home" size={16} color="#fff" />
                    </Pressable>
                    <Pressable
                      onPress={() => handleSend("Pan right")}
                      style={[
                        styles.dpadButton,
                        { backgroundColor: theme.backgroundDefault },
                      ]}
                    >
                      <Feather
                        name="chevron-right"
                        size={20}
                        color={theme.primary}
                      />
                    </Pressable>
                  </View>
                  <View style={styles.dpadRow}>
                    <View style={styles.dpadSpacer} />
                    <Pressable
                      onPress={() => handleSend("Tilt down")}
                      style={[
                        styles.dpadButton,
                        { backgroundColor: theme.backgroundDefault },
                      ]}
                    >
                      <Feather
                        name="chevron-down"
                        size={20}
                        color={theme.primary}
                      />
                    </Pressable>
                    <View style={styles.dpadSpacer} />
                  </View>
                </View>
              </View>

              <View style={styles.controlSection}>
                <Text
                  style={[styles.controlSectionTitle, { color: theme.primary }]}
                >
                  Zoom & Focus
                </Text>
                <View style={styles.controlButtonsRow}>
                  <Pressable
                    onPress={() => handleSend("Zoom out")}
                    style={[
                      styles.controlButton,
                      { backgroundColor: theme.backgroundDefault },
                    ]}
                  >
                    <Feather name="zoom-out" size={16} color={theme.primary} />
                    <Text
                      style={[styles.controlButtonText, { color: theme.text }]}
                    >
                      Zoom -
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleSend("Zoom in")}
                    style={[
                      styles.controlButton,
                      { backgroundColor: theme.backgroundDefault },
                    ]}
                  >
                    <Feather name="zoom-in" size={16} color={theme.primary} />
                    <Text
                      style={[styles.controlButtonText, { color: theme.text }]}
                    >
                      Zoom +
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleSend("Auto focus")}
                    style={[
                      styles.controlButton,
                      { backgroundColor: theme.backgroundDefault },
                    ]}
                  >
                    <Feather name="target" size={16} color={theme.primary} />
                    <Text
                      style={[styles.controlButtonText, { color: theme.text }]}
                    >
                      Focus
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.controlSection}>
                <Text
                  style={[styles.controlSectionTitle, { color: theme.primary }]}
                >
                  Presets
                </Text>
                <View style={styles.controlButtonsRow}>
                  {[1, 2, 3, 4].map((preset) => (
                    <Pressable
                      key={preset}
                      onPress={() => handleSend(`Go to preset ${preset}`)}
                      style={[
                        styles.presetButton,
                        { backgroundColor: theme.backgroundDefault },
                      ]}
                    >
                      <Text
                        style={[
                          styles.presetButtonText,
                          { color: theme.primary },
                        ]}
                      >
                        {preset}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={styles.controlSection}>
                <Text
                  style={[styles.controlSectionTitle, { color: theme.primary }]}
                >
                  Camera
                </Text>
                <View style={styles.controlButtonsRow}>
                  <Pressable
                    onPress={() => handleSend("Zoom out")}
                    style={[
                      styles.controlButton,
                      { backgroundColor: theme.backgroundDefault },
                    ]}
                  >
                    <Feather name="zoom-out" size={16} color={theme.primary} />
                    <Text
                      style={[styles.controlButtonText, { color: theme.text }]}
                    >
                      Zoom -
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleSend("Zoom in")}
                    style={[
                      styles.controlButton,
                      { backgroundColor: theme.backgroundDefault },
                    ]}
                  >
                    <Feather name="zoom-in" size={16} color={theme.primary} />
                    <Text
                      style={[styles.controlButtonText, { color: theme.text }]}
                    >
                      Zoom +
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.controlSection}>
                <Text
                  style={[styles.controlSectionTitle, { color: theme.primary }]}
                >
                  Exposure & Flash
                </Text>
                <View style={styles.controlButtonsRow}>
                  <Pressable
                    onPress={() => handleSend("Decrease exposure")}
                    style={[
                      styles.controlButton,
                      { backgroundColor: theme.backgroundDefault },
                    ]}
                  >
                    <Feather name="sun" size={16} color={theme.primary} />
                    <Text
                      style={[styles.controlButtonText, { color: theme.text }]}
                    >
                      Darker
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleSend("Increase exposure")}
                    style={[
                      styles.controlButton,
                      { backgroundColor: theme.backgroundDefault },
                    ]}
                  >
                    <Feather name="sun" size={16} color={theme.primary} />
                    <Text
                      style={[styles.controlButtonText, { color: theme.text }]}
                    >
                      Brighter
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleSend("Toggle flash")}
                    style={[
                      styles.controlButton,
                      { backgroundColor: theme.backgroundDefault },
                    ]}
                  >
                    <Feather name="zap" size={16} color={theme.primary} />
                    <Text
                      style={[styles.controlButtonText, { color: theme.text }]}
                    >
                      Flash
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.controlSection}>
                <Text
                  style={[styles.controlSectionTitle, { color: theme.primary }]}
                >
                  Focus
                </Text>
                <View style={styles.controlButtonsRow}>
                  <Pressable
                    onPress={() => handleSend("Auto focus")}
                    style={[
                      styles.controlButton,
                      { backgroundColor: theme.backgroundDefault },
                    ]}
                  >
                    <Feather name="target" size={16} color={theme.primary} />
                    <Text
                      style={[styles.controlButtonText, { color: theme.text }]}
                    >
                      Auto Focus
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleSend("Focus on center")}
                    style={[
                      styles.controlButton,
                      { backgroundColor: theme.backgroundDefault },
                    ]}
                  >
                    <Feather name="crosshair" size={16} color={theme.primary} />
                    <Text
                      style={[styles.controlButtonText, { color: theme.text }]}
                    >
                      Center
                    </Text>
                  </Pressable>
                </View>
              </View>
            </>
          )}
        </Animated.View>
      )}

      {isListening && (
        <Animated.View
          entering={FadeIn}
          style={[
            styles.listeningBanner,
            { backgroundColor: theme.primary + "15" },
          ]}
        >
          <Feather name="mic" size={14} color={theme.primary} />
          <Text
            style={[styles.listeningText, { color: theme.primary }]}
            numberOfLines={1}
          >
            {interimTranscript || "Listening..."}
          </Text>
        </Animated.View>
      )}

      <View
        style={[
          styles.inputContainer,
          { backgroundColor: theme.backgroundDefault },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            { color: theme.text, backgroundColor: theme.backgroundSecondary },
          ]}
          placeholder={isListening ? "Listening..." : "Ask me anything..."}
          placeholderTextColor={theme.textSecondary}
          value={isListening ? interimTranscript : inputText}
          onChangeText={setInputText}
          onSubmitEditing={() => handleSend()}
          returnKeyType="send"
          editable={!isProcessing && !isListening}
        />
        <Animated.View style={isListening ? pulsingStyle : undefined}>
          <Pressable
            onPress={handleVoiceInput}
            disabled={isProcessing}
            style={[
              styles.voiceButton,
              {
                backgroundColor: isListening
                  ? theme.error
                  : theme.backgroundSecondary,
              },
            ]}
          >
            <Feather
              name={isListening ? "mic-off" : "mic"}
              size={18}
              color={isListening ? "#fff" : theme.primary}
            />
          </Pressable>
        </Animated.View>
        <Pressable
          onPress={() => handleSend()}
          disabled={!inputText.trim() || isProcessing || isListening}
          style={[
            styles.sendButton,
            {
              backgroundColor:
                inputText.trim() && !isProcessing && !isListening
                  ? theme.primary
                  : theme.backgroundSecondary,
            },
          ]}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color={theme.textSecondary} />
          ) : (
            <Feather
              name="send"
              size={18}
              color={
                inputText.trim() && !isListening ? "#fff" : theme.textSecondary
              }
            />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
  },
  disconnectedText: {
    fontSize: Typography.body.fontSize,
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.sm,
  },
  userMessageContainer: {
    justifyContent: "flex-end",
  },
  assistantMessageContainer: {
    justifyContent: "flex-start",
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  messageBubble: {
    maxWidth: "75%",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  userBubble: {
    borderBottomRightRadius: BorderRadius.xs,
  },
  assistantBubble: {
    borderBottomLeftRadius: BorderRadius.xs,
  },
  messageImage: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  messageText: {
    fontSize: Typography.body.fontSize,
    lineHeight: 22,
  },
  detectableWord: {
    fontWeight: "600",
    paddingHorizontal: 2,
    borderRadius: 3,
  },
  actionWord: {
    fontWeight: "600",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  typingDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.6,
  },
  typingText: {
    fontSize: Typography.small.fontSize,
  },
  suggestionsContainer: {
    marginTop: Spacing.lg,
  },
  suggestionsTitle: {
    fontSize: Typography.small.fontSize,
    marginBottom: Spacing.sm,
  },
  suggestionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  suggestionChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 22,
  },
  suggestionText: {
    fontSize: Typography.small.fontSize,
  },
  inputContainer: {
    flexDirection: "row",
    padding: Spacing.md,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.body.fontSize,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  sourceBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    marginTop: Spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  sourceBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  sourceBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  sourceBarText: {
    fontSize: Typography.small.fontSize,
    fontWeight: "500",
  },
  aiIndicator: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  aiIndicatorText: {
    fontSize: 10,
    fontWeight: "700",
  },
  connectPtzButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  connectPtzText: {
    color: "#fff",
    fontSize: Typography.small.fontSize,
    fontWeight: "600",
  },
  quickActionsContainer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
    paddingVertical: Spacing.sm,
  },
  quickActionsScroll: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  quickActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "500",
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  listeningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  listeningText: {
    flex: 1,
    fontSize: Typography.small.fontSize,
    fontStyle: "italic",
  },
  voiceHelpPanel: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  voiceHelpHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  voiceHelpTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  voiceHelpSection: {
    marginBottom: Spacing.sm,
  },
  voiceHelpCategory: {
    fontSize: Typography.small.fontSize,
    fontWeight: "600",
    marginBottom: 2,
  },
  voiceHelpCommand: {
    fontSize: Typography.small.fontSize,
    lineHeight: 18,
  },
  voiceToggleRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  voiceToggleItem: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  voiceToggleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  voiceToggleLabel: {
    fontSize: 10,
    fontWeight: "500",
  },
  activeProcessBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  activeProcessInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  activeProcessText: {
    fontSize: Typography.small.fontSize,
    fontWeight: "500",
  },
  cancelProcessButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  cancelProcessText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  followUpContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  followUpButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  followUpText: {
    fontSize: 12,
    fontWeight: "500",
  },
  inlineActionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  inlineActionButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  repeatableActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  },
  inlineActionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  cameraControlsPanel: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  cameraControlsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  cameraControlsTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  controlSection: {
    marginBottom: Spacing.md,
  },
  controlSectionTitle: {
    fontSize: Typography.small.fontSize,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  dpadContainer: {
    alignItems: "center",
    gap: 4,
  },
  dpadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dpadSpacer: {
    width: 44,
    height: 44,
  },
  dpadButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  dpadCenter: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  controlButtonsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  controlButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.md,
  },
  controlButtonText: {
    fontSize: 12,
    fontWeight: "500",
  },
  presetButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  presetButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
