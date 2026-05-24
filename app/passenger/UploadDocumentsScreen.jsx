import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Text, Button, ProgressBar, Snackbar, ActivityIndicator, Banner, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Store, Component & Service Imports
import { useAuthStore } from '../../store/authStore';
import { useRequestStore } from '../../store/requestStore';
import DocumentUploader from '../../components/DocumentUploader';
import { uploadMultipleDocuments, validateUploadConfig } from '../../services/uploadService';
import { 
  createRequest, 
  loadRequestDraft, 
  clearRequestDraft 
} from '../../services/requestService';

/**
 * UploadDocumentsScreen component.
 * Represents Step 3 (final) of the passenger assistance request wizard.
 * Handles picking document attachments (ID, Ticket, Medical Certificate),
 * uploading them to Firebase Cloud Storage, creating the Firestore request,
 * updating links, and cleaning up draft states.
 * 
 * @param {Object} props - React Navigation props.
 * @param {Object} props.navigation - Navigation controller.
 * @returns {React.JSX.Element} UploadDocumentsScreen layout.
 */
export default function UploadDocumentsScreen({ navigation }) {
  const theme = useTheme();
  const { user, userProfile } = useAuthStore();
  const { draftForm, mergeDraftForm, clearDraft, loadDraft } = useRequestStore();

  // Local document URI states
  const [selectedDocs, setSelectedDocs] = useState({
    id: null,
    ticket: null,
    medical: null,
  });

  // Local upload progress percentages
  const [uploadProgress, setUploadProgress] = useState({
    id: 0,
    ticket: 0,
    medical: 0,
  });

  // Local uploaded download URL states
  const [uploadedUrls, setUploadedUrls] = useState({
    id: null,
    ticket: null,
    medical: null,
  });

  // Upload/Submission loading & messaging states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [overallProgressMsg, setOverallProgressMsg] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Draft recovery banner visibility state
  const [draftBannerVisible, setDraftBannerVisible] = useState(false);
  const [draftTimestamp, setDraftTimestamp] = useState('');

  // Check for unsaved drafts on mount
  useEffect(() => {
    const detectDraft = async () => {
      if (!user?.uid) return;
      try {
        const localDraft = await loadRequestDraft(user.uid);
        // Display banner if draft has fields but isn't currently loaded in Zustand
        if (localDraft && (!draftForm || !draftForm.airportName)) {
          setDraftBannerVisible(true);
          if (localDraft.travelDate) {
            const dateVal = new Date(localDraft.travelDate);
            setDraftTimestamp(dateVal.toLocaleDateString());
          } else {
            setDraftTimestamp('previous session');
          }
        }
      } catch (err) {
        console.error('Error checking draft in UploadDocumentsScreen:', err);
      }
    };
    detectDraft();
  }, [user]);

  /**
   * Recovers and populates draft details from storage.
   */
  const handleRecoverDraft = async () => {
    if (!user?.uid) return;
    try {
      await loadDraft(user.uid);
      setDraftBannerVisible(false);
    } catch (err) {
      setErrorMessage('Failed to recover draft.');
      setSnackbarVisible(true);
    }
  };

  /**
   * Discards the unsaved draft from storage.
   */
  const handleDiscardDraft = async () => {
    if (!user?.uid) return;
    try {
      await clearRequestDraft(user.uid);
      setDraftBannerVisible(false);
    } catch (err) {
      setErrorMessage('Failed to discard draft.');
      setSnackbarVisible(true);
    }
  };

  /**
   * Callback fired when a document picker selects a file.
   * 
   * @param {string} uri - Local file URI.
   * @param {string} type - Document type ('id' | 'ticket' | 'medical').
   */
  const handleDocumentSelected = (uri, type) => {
    setSelectedDocs((prev) => ({ ...prev, [type]: uri }));
    // Reset progress and URL states for this slot upon change
    setUploadProgress((prev) => ({ ...prev, [type]: 0 }));
    setUploadedUrls((prev) => ({ ...prev, [type]: null }));
  };

  /**
   * Orchestrates the complete submission lifecycle:
   * 1. Creates request record in Firestore.
   * 2. Uploads selected files to Storage.
   * 3. Syncs storage download URLs back to Firestore.
   * 4. Deletes draft and redirects.
   * 
   * @param {boolean} skipDocs - True if passenger is submitting without files.
   */
  const executeSubmission = async (skipDocs = false) => {
    if (!user?.uid || !userProfile) return;

    setIsSubmitting(true);
    setOverallProgressMsg('Submitting request details...');

    try {
      const tripData = draftForm || {};
      const pendingUploadId = `pending_${user.uid}_${Date.now()}`;
      let uploadedDocuments = [];

      if (!skipDocs && (selectedDocs.id || selectedDocs.ticket || selectedDocs.medical)) {
        validateUploadConfig();
        const filesToUpload = [];
        if (selectedDocs.id) filesToUpload.push({ uri: selectedDocs.id, docType: 'id' });
        if (selectedDocs.ticket) filesToUpload.push({ uri: selectedDocs.ticket, docType: 'ticket' });
        if (selectedDocs.medical) filesToUpload.push({ uri: selectedDocs.medical, docType: 'medical' });

        if (filesToUpload.length > 0) {
          setOverallProgressMsg(`Uploading documents (0/${filesToUpload.length})...`);

          let completedCount = 0;
          uploadedDocuments = await uploadMultipleDocuments(
            filesToUpload,
            pendingUploadId,
            user.uid,
            (percent, type) => {
              setUploadProgress((prev) => ({ ...prev, [type]: percent }));
              if (percent === 100) {
                // Approximate tracker (triggers when a file completes)
                completedCount += 1;
                setOverallProgressMsg(`Uploading documents (${Math.min(completedCount, filesToUpload.length)}/${filesToUpload.length})...`);
              }
            }
          );
        }
      }

      // 1. Submit Request Record to Firestore after uploads succeed
      setOverallProgressMsg('Saving request details...');
      const requestId = await createRequest(
        {
          ...tripData,
          documentUrls: uploadedDocuments.map((doc) => doc.downloadURL),
          documentPaths: uploadedDocuments.map((doc) => doc.path),
        },
        user.uid,
        userProfile
      );

      // 2. Cleanup Local draft states
      setOverallProgressMsg('Finalizing request...');
      await clearRequestDraft(user.uid);
      await clearDraft(user.uid);

      // 3. Navigate to progress tracker screen
      setIsSubmitting(false);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }, { name: 'RequestTracking', params: { requestId, submissionSuccess: true } }],
      });
    } catch (error) {
      setUploadProgress({
        id: 0,
        ticket: 0,
        medical: 0,
      });
      setOverallProgressMsg('');
      setErrorMessage(error.message || 'An error occurred during submission.');
      setSnackbarVisible(true);
      setIsSubmitting(false);
    }
  };

  /**
   * Prompts passenger for confirmation before finalizing request.
   */
  const handleSubmit = () => {
    // Validate that at least ID or Ticket is selected
    if (!selectedDocs.id && !selectedDocs.ticket) {
      Alert.alert(
        'Documents Required',
        'Please upload at least one document (Identity Proof or Flight Ticket) to verify your assistance request. Otherwise, use "Skip & Submit" if you do not have documents.'
      );
      return;
    }

    const tripData = draftForm || {};
    Alert.alert(
      'Confirm Request',
      `Submit your assistance request?\n\nPassenger: ${userProfile?.name}\nFlight: ${tripData.flightNumber}\nType: ${tripData.assistanceType}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Submit', onPress: () => executeSubmission(false) },
      ]
    );
  };

  /**
   * Triggers a warning modal before submitting request without any document attachments.
   */
  const handleSkipAndSubmit = () => {
    Alert.alert(
      'Skip Verification Documents?',
      'Submitting without verification documents (ID/Ticket) may cause delays in approval. Are you sure you want to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Proceed', style: 'destructive', onPress: () => executeSubmission(true) },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Draft recovery banner */}
      <Banner
        visible={draftBannerVisible}
        actions={[
          { label: 'Recover', onPress: handleRecoverDraft },
          { label: 'Discard', onPress: handleDiscardDraft, style: { color: theme.colors.error } },
        ]}
        icon="backup-restore"
        style={styles.banner}
      >
        You have an unsaved draft from {draftTimestamp}. Would you like to recover it?
      </Banner>

      {/* Progress Bar (Step 3 of 3) */}
      <ProgressBar progress={1.0} color={theme.colors.primary} style={styles.progressBar} />

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.headerArea}>
          <Text variant="titleMedium" style={[styles.stepText, { color: theme.colors.placeholder }]}>
            STEP 3 OF 3
          </Text>
          <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.subtext, fontWeight: '700' }]}> 
            Verification Documents
          </Text>
          <Text variant="bodyMedium" style={[styles.instruction, { color: theme.colors.placeholder }]}>
            Please upload at least one document to expedite assistance verification. (Max size 5MB each)
          </Text>
        </View>

        {/* Identity Proof */}
        <DocumentUploader
          docType="id"
          label="Identity Proof (Passport, Aadhaar, National ID)*"
          onDocumentSelected={handleDocumentSelected}
          selectedUri={selectedDocs.id}
          uploadProgress={uploadProgress.id}
          uploadedUrl={uploadedUrls.id}
          error={null}
        />

        {/* Boarding Pass / Ticket */}
        <DocumentUploader
          docType="ticket"
          label="Flight Ticket / Boarding Pass*"
          onDocumentSelected={handleDocumentSelected}
          selectedUri={selectedDocs.ticket}
          uploadProgress={uploadProgress.ticket}
          uploadedUrl={uploadedUrls.ticket}
          error={null}
        />

        {/* Medical Certificate (Optional) */}
        <DocumentUploader
          docType="medical"
          label="Medical Certificate (Required for medical/wheelchair care)*"
          onDocumentSelected={handleDocumentSelected}
          selectedUri={selectedDocs.medical}
          uploadProgress={uploadProgress.medical}
          uploadedUrl={uploadedUrls.medical}
          error={null}
        />

        {/* Submit Actions */}
        {isSubmitting ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator animating={true} color={theme.colors.primary} size="large" />
            <Text variant="titleMedium" style={[styles.loaderText, { color: theme.colors.primary }]}>
              {overallProgressMsg}
            </Text>
          </View>
        ) : (
          <View style={styles.actionContainer}>
            <Button
              mode="contained"
              onPress={handleSubmit}
              style={styles.submitBtn}
              contentStyle={styles.btnContent}
              icon="send"
            >
              Submit Request
            </Button>
            
            <Button
              mode="text"
              onPress={handleSkipAndSubmit}
              style={styles.skipBtn}
            >
              Skip & Submit Without Documents
            </Button>
          </View>
        )}
      </ScrollView>

      {/* Snackbar notification for errors */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4500}
        action={{
          label: 'Dismiss',
          onPress: () => setSnackbarVisible(false),
        }}
        style={{ backgroundColor: theme.colors.error }}
      >
        {errorMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressBar: {
    height: 4,
  },
  banner: {
    elevation: 2,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  headerArea: {
    marginBottom: 20,
  },
  stepText: {
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  title: {
    fontWeight: 'bold',
    marginTop: 4,
  },
  instruction: {
    marginTop: 6,
    lineHeight: 18,
  },
  loaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 30,
  },
  loaderText: {
    marginTop: 12,
    fontWeight: 'bold',
  },
  actionContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  submitBtn: {
    width: '100%',
    borderRadius: 8,
  },
  btnContent: {
    paddingVertical: 6,
  },
  skipBtn: {
    marginTop: 10,
  },
});
