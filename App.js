import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';

const API_BASE_URL = (Constants.expoConfig?.extra?.apiUrl || 'http://localhost:5000').replace(/\/$/, '');
const EMPTY_FORM = { name: '', course: '', year: '' };

// --- Subcomponents ---

function InputField({ label, placeholder, value, onChangeText, returnKeyType = 'next' }) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize="words"
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.muted}
        returnKeyType={returnKeyType}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function StudentCard({ item }) {
  const initial = (item.name || '?').trim().charAt(0).toUpperCase();

  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      <View style={styles.cardDetails}>
        <Text style={styles.studentName}>{item.name}</Text>
        <Text style={styles.studentCourse}>{item.course}</Text>
      </View>
      <View style={styles.yearBadge}>
        <Text style={styles.yearBadgeText}>{item.year}</Text>
      </View>
    </View>
  );
}

function HeaderComponent({
  form,
  updateField,
  handleSubmit,
  isSubmitting,
  studentsCount,
  error,
  notice,
  isRefreshing,
  handleRefresh,
}) {
  return (
    <View style={styles.headerContainer}>
      {/* Top Banner */}
      <View style={styles.topline}>
        <Text style={styles.eyebrow}>ACADEMIC RECORDS</Text>
        <View style={styles.countBadge}>
          <Text style={styles.recordCount}>
            {studentsCount} {studentsCount === 1 ? 'Record' : 'Records'}
          </Text>
        </View>
      </View>

      <Text style={styles.title}>Student Directory</Text>
      <Text style={styles.subtitle}>Register new students and manage enrollment data.</Text>

      {/* Form Card */}
      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Add New Student</Text>

        <InputField
          label="Student Name"
          placeholder="e.g. Alex Morgan"
          value={form.name}
          onChangeText={(value) => updateField('name', value)}
        />
        <InputField
          label="Course / Program"
          placeholder="e.g. Computer Science"
          value={form.course}
          onChangeText={(value) => updateField('course', value)}
        />
        <InputField
          label="Year Level"
          placeholder="e.g. 2nd Year"
          value={form.year}
          returnKeyType="done"
          onChangeText={(value) => updateField('year', value)}
        />

        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.submitButton,
            pressed && styles.buttonPressed,
            isSubmitting && styles.buttonDisabled,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color={theme.colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>Save Record</Text>
          )}
        </Pressable>
      </View>

      {/* Feedback Alerts */}
      {error ? <Text style={styles.errorMessage}>{error}</Text> : null}
      {notice ? <Text style={styles.successMessage}>{notice}</Text> : null}

      {/* Section Divider & Refresh */}
      <View style={styles.listHeading}>
        <View>
          <Text style={styles.sectionTitle}>Enrolled Students</Text>
          <Text style={styles.listSubtitle}>Synchronized with Database</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh student list"
          disabled={isRefreshing}
          onPress={handleRefresh}
          style={({ pressed }) => [
            styles.refreshButton,
            pressed && styles.refreshPressed,
            isRefreshing && styles.buttonDisabled,
          ]}
        >
          {isRefreshing ? (
            <ActivityIndicator color={theme.colors.primary} size="small" />
          ) : (
            <Text style={styles.refreshButtonText}>Refresh</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// --- Main App Component ---

export default function App() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function fetchStudents() {
    const response = await fetch(`${API_BASE_URL}/students`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Could not load student records.');
    }
    if (!Array.isArray(data)) {
      throw new Error('The student API returned an unexpected response.');
    }
    return data;
  }

  async function loadStudents() {
    try {
      setStudents(await fetchStudents());
      setError('');
      return true;
    } catch (requestError) {
      setError(
        requestError.message ||
          `Could not reach ${API_BASE_URL}. Check backend connection.`,
      );
      return false;
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadStudents();
  }

  useEffect(() => {
    let isMounted = true;
    fetchStudents()
      .then((data) => {
        if (isMounted) {
          setStudents(data);
          setError('');
        }
      })
      .catch((requestError) => {
        if (isMounted) {
          setError(
            requestError.message ||
              `Could not reach ${API_BASE_URL}. Check backend connection.`,
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function updateField(field, value) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  async function handleSubmit() {
    const student = {
      name: form.name.trim(),
      course: form.course.trim(),
      year: form.year.trim(),
    };

    if (!student.name || !student.course || !student.year) {
      setNotice('');
      setError('Please complete all form fields.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch(`${API_BASE_URL}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(student),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Could not save this student.');
      }

      setForm(EMPTY_FORM);
      setNotice('Student registered successfully.');
      setIsRefreshing(true);
      const refreshed = await loadStudents();
      if (!refreshed) {
        setNotice('Student saved. Pull or click refresh to sync changes.');
      }
    } catch (requestError) {
      setError(
        requestError.message ||
          `Could not reach ${API_BASE_URL}. Check backend connection.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <FlatList
        data={students}
        keyExtractor={(item, index) => String(item._id || item.id || index)}
        renderItem={({ item }) => <StudentCard item={item} />}
        contentContainerStyle={styles.listContent}
        style={styles.screen}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <HeaderComponent
            form={form}
            updateField={updateField}
            handleSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            studentsCount={students.length}
            error={error}
            notice={notice}
            isRefreshing={isRefreshing}
            handleRefresh={handleRefresh}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {isLoading ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <Text style={styles.emptyText}>
                {error ? 'Student records unavailable.' : 'No students found.'}
              </Text>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

// --- Theme & Styles ---

const theme = {
  colors: {
    background: '#F4F6F8',
    white: '#FFFFFF',
    ink: '#0F172A',
    muted: '#64748B',
    line: '#E2E8F0',
    primary: '#0D9488',
    primaryDark: '#0F766E',
    primaryLight: '#CCFBF1',
    danger: '#E11D48',
    dangerLight: '#FFE4E6',
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
  },
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  screen: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  headerContainer: {
    marginBottom: 8,
  },
  topline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  countBadge: {
    backgroundColor: theme.colors.line,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  recordCount: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    color: theme.colors.ink,
    fontSize: 32,
    fontWeight: '800',
    marginTop: 6,
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 14,
    marginTop: 2,
  },
  formCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.md,
    padding: 18,
    marginTop: 20,
    borderWidth: 1,
    borderColor: theme.colors.line,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: '700',
  },
  inputGroup: {
    marginTop: 14,
  },
  fieldLabel: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FAFAFA',
    borderColor: theme.colors.line,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    color: theme.colors.ink,
    fontSize: 15,
    minHeight: 46,
    paddingHorizontal: 14,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    justifyContent: 'center',
    marginTop: 20,
    minHeight: 48,
  },
  submitButtonText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  buttonPressed: {
    backgroundColor: theme.colors.primaryDark,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorMessage: {
    backgroundColor: theme.colors.dangerLight,
    borderRadius: theme.radius.sm,
    color: theme.colors.danger,
    fontSize: 13,
    marginTop: 14,
    padding: 12,
    fontWeight: '500',
  },
  successMessage: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.radius.sm,
    color: theme.colors.primaryDark,
    fontSize: 13,
    marginTop: 14,
    padding: 12,
    fontWeight: '600',
  },
  listHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 28,
  },
  listSubtitle: {
    color: theme.colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  refreshButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 14,
  },
  refreshButtonText: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: '600',
  },
  refreshPressed: {
    backgroundColor: theme.colors.line,
  },
  card: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    padding: 14,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.radius.sm,
    height: 44,
    justifyContent: 'center',
    marginRight: 12,
    width: 44,
  },
  avatarText: {
    color: theme.colors.primaryDark,
    fontSize: 18,
    fontWeight: '800',
  },
  cardDetails: {
    flex: 1,
  },
  studentName: {
    color: theme.colors.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  studentCourse: {
    color: theme.colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  yearBadge: {
    backgroundColor: theme.colors.background,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  yearBadgeText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 100,
    padding: 20,
  },
  emptyText: {
    color: theme.colors.muted,
    fontSize: 14,
  },
});