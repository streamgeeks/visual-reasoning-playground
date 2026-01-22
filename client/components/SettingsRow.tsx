import React from "react";
import { View, StyleSheet, Pressable, Text, Switch, TextInput } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

interface SettingsRowProps {
  icon?: string;
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
}

interface SettingsToggleProps {
  icon?: string;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

interface SettingsInputProps {
  icon?: string;
  label: string;
  value: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  onChangeText: (text: string) => void;
}

export function SettingsRow({ icon, label, value, onPress, showChevron = true }: SettingsRowProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      {icon ? (
        <View style={[styles.iconContainer, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name={icon as any} size={18} color={theme.primary} />
        </View>
      ) : null}

      <View style={styles.content}>
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        {value ? (
          <Text style={[styles.value, { color: theme.textSecondary }]}>{value}</Text>
        ) : null}
      </View>

      {showChevron && onPress ? (
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      ) : null}
    </Pressable>
  );
}

export function SettingsToggle({
  icon,
  label,
  description,
  value,
  onValueChange,
}: SettingsToggleProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
      {icon ? (
        <View style={[styles.iconContainer, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name={icon as any} size={18} color={theme.primary} />
        </View>
      ) : null}

      <View style={styles.content}>
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        {description ? (
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            {description}
          </Text>
        ) : null}
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.backgroundSecondary, true: theme.primary + "80" }}
        thumbColor={value ? theme.primary : theme.textSecondary}
      />
    </View>
  );
}

export function SettingsInput({
  icon,
  label,
  value,
  placeholder,
  secureTextEntry,
  onChangeText,
}: SettingsInputProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.inputContainer, { backgroundColor: theme.backgroundDefault }]}>
      {icon ? (
        <View style={[styles.iconContainer, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name={icon as any} size={18} color={theme.primary} />
        </View>
      ) : null}

      <View style={styles.inputContent}>
        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{label}</Text>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          secureTextEntry={secureTextEntry}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: Typography.body.fontSize,
    fontWeight: "500",
  },
  value: {
    fontSize: Typography.small.fontSize,
    marginTop: 2,
  },
  description: {
    fontSize: Typography.small.fontSize,
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  inputContent: {
    flex: 1,
  },
  inputLabel: {
    fontSize: Typography.caption.fontSize,
    marginBottom: 4,
  },
  input: {
    fontSize: Typography.body.fontSize,
    padding: 0,
  },
});
