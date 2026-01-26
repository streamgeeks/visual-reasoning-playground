import AsyncStorage from "@react-native-async-storage/async-storage";
import { PersonProfile, generateId } from "./storage";

const STORAGE_KEYS = {
  PERSON_PROFILES: "@vrp_person_profiles",
} as const;

/**
 * Calculate cosine similarity between two embedding vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Load all person profiles from storage
 */
export async function loadPersonProfiles(): Promise<PersonProfile[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PERSON_PROFILES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Save a person profile (upsert - creates or updates)
 */
export async function savePersonProfile(profile: PersonProfile): Promise<void> {
  try {
    const profiles = await loadPersonProfiles();
    const existingIndex = profiles.findIndex((p) => p.id === profile.id);

    if (existingIndex >= 0) {
      profiles[existingIndex] = profile;
    } else {
      profiles.push(profile);
    }

    await AsyncStorage.setItem(STORAGE_KEYS.PERSON_PROFILES, JSON.stringify(profiles));
  } catch (error) {
    console.error("Failed to save person profile:", error);
    throw error;
  }
}

/**
 * Delete a person profile by ID
 */
export async function deletePersonProfile(id: string): Promise<void> {
  try {
    const profiles = await loadPersonProfiles();
    const filtered = profiles.filter((p) => p.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.PERSON_PROFILES, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to delete person profile:", error);
    throw error;
  }
}

/**
 * Find person profiles by embedding similarity
 * @param targetEmbedding The embedding vector to search for
 * @param threshold Minimum cosine similarity threshold (0-1, default 0.7)
 * @returns Array of matching profiles sorted by similarity (highest first)
 */
export async function findPersonByEmbedding(
  targetEmbedding: number[],
  threshold: number = 0.7
): Promise<Array<PersonProfile & { similarity: number }>> {
  try {
    const profiles = await loadPersonProfiles();

    const results = profiles
      .map((profile) => ({
        ...profile,
        similarity: cosineSimilarity(targetEmbedding, profile.embedding),
      }))
      .filter((result) => result.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity);

    return results;
  } catch (error) {
    console.error("Failed to find person by embedding:", error);
    return [];
  }
}

/**
 * Create a new person profile with generated ID
 */
export function createPersonProfile(
  name: string,
  imageUri: string,
  embedding: number[]
): PersonProfile {
  return {
    id: generateId(),
    name,
    imageUri,
    embedding,
    createdAt: new Date().toISOString(),
  };
}
