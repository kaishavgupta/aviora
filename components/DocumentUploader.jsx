import React from 'react';
import { StyleSheet, View, Image, Alert } from 'react-native';
import { Card, Text, Button, IconButton, ProgressBar, useTheme } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

/**
 * Helper to check if a URI points to a PDF.
 * 
 * @param {string} uri - The file URI.
 * @returns {boolean} True if it is a PDF.
 */
const isPdfFile = (uri) => {
  if (!uri) return false;
  const cleanUri = uri.split('?')[0].toLowerCase();
  return cleanUri.endsWith('.pdf');
};

/**
 * DocumentUploader component.
 * Allows passengers to pick documents via Camera, Photo Library, or File System,
 * validates file size, and handles upload progress & state displays.
 * 
 * @param {Object} props - Component props.
 * @param {string} props.docType - Type of document ('id' | 'ticket' | 'medical').
 * @param {string} props.label - User facing label (e.g. "Passport Copy").
 * @param {Function} props.onDocumentSelected - Callback triggered when file is selected: (uri, docType, filename).
 * @param {string|null} props.selectedUri - The currently selected local file URI.
 * @param {number|null} props.uploadProgress - Progress percentage (0 to 100).
 * @param {string|null} props.uploadedUrl - The uploaded Firebase Storage download URL.
 * @param {string|null} props.error - Inline error message.
 * @returns {React.JSX.Element} DocumentUploader component.
 */
export default function DocumentUploader({
  docType,
  label,
  onDocumentSelected,
  selectedUri,
  uploadProgress,
  uploadedUrl,
  error
}) {
  const theme = useTheme();

  // Extract filename from URI
  const getFilename = (uri) => {
    if (!uri) return '';
    return uri.split('/').pop().split('?')[0];
  };

  /**
   * Prompts camera permissions and opens native camera to capture photo.
   */
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permissions are required to take photos of documents.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        // Validate File Size
        if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
          Alert.alert('File Too Large', 'The selected image exceeds the 5MB file size limit.');
          return;
        }

        onDocumentSelected(asset.uri, docType, getFilename(asset.uri));
      }
    } catch (err) {
      console.error('Error taking photo:', err);
      Alert.alert('Error', 'Could not access camera.');
    }
  };

  /**
   * Opens photo library picker.
   */
  const handleChoosePhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        // Validate File Size
        if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
          Alert.alert('File Too Large', 'The selected image exceeds the 5MB file size limit.');
          return;
        }

        onDocumentSelected(asset.uri, docType, getFilename(asset.uri));
      }
    } catch (err) {
      console.error('Error picking photo from gallery:', err);
      Alert.alert('Error', 'Could not open image library.');
    }
  };

  /**
   * Opens native document selector for PDF or Image files.
   */
  const handleChooseFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        // Validate File Size
        if (asset.size && asset.size > MAX_FILE_SIZE) {
          Alert.alert('File Too Large', 'The selected file exceeds the 5MB file size limit.');
          return;
        }

        onDocumentSelected(asset.uri, docType, asset.name || getFilename(asset.uri));
      }
    } catch (err) {
      console.error('Error picking document file:', err);
      Alert.alert('Error', 'Could not open document picker.');
    }
  };

  return (
    <Card style={[styles.card, { borderColor: error ? theme.colors.error : theme.colors.outline }]} mode="outlined">
      <Card.Content>
        {/* Label */}
        <Text variant="titleMedium" style={[styles.title, { color: theme.colors.primary }]}>
          {label}
        </Text>

        {!selectedUri ? (
          // UNSELECTED STATE: Show Upload Zone & Options
          <View style={styles.unselectedContainer}>
            <View style={[styles.uploadZone, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surface }]}>
              <MaterialCommunityIcons name="cloud-upload-outline" size={40} color={theme.colors.outline} />
              <Text variant="bodyMedium" style={{ color: theme.colors.subtext, marginTop: 4 }}>
                Upload verification document
              </Text>
            </View>

            <View style={styles.actionRow}>
              <Button 
                mode="text" 
                icon="camera" 
                onPress={handleTakePhoto} 
                compact
                style={styles.actionBtn}
              >
                Camera
              </Button>
              <Button 
                mode="text" 
                icon="image-outline" 
                onPress={handleChoosePhoto} 
                compact
                style={styles.actionBtn}
              >
                Gallery
              </Button>
              <Button 
                mode="text" 
                icon="file-document-outline" 
                onPress={handleChooseFile} 
                compact
                style={styles.actionBtn}
              >
                File/PDF
              </Button>
            </View>
          </View>
        ) : (
          // SELECTED STATE: Show preview, upload state, change actions
          <View style={styles.selectedContainer}>
            <View style={styles.previewContainer}>
                {isPdfFile(selectedUri) ? (
                // PDF File Representation
                <View style={[styles.pdfWrapper, { backgroundColor: theme.colors.outline + '20' }]}>
                  <MaterialCommunityIcons name="file-pdf-box" size={48} color={theme.colors.error} />
                  <Text numberOfLines={2} variant="bodySmall" style={[styles.filenameText, { color: theme.colors.subtext }]}>
                    {getFilename(selectedUri)}
                  </Text>
                </View>
              ) : (
                // Image File Representation
                <Image 
                  source={{ uri: selectedUri }} 
                  style={styles.previewImage} 
                  resizeMode="cover"
                />
              )}

              {/* Status indicator / Change button */}
              <View style={styles.statusWrapper}>
                {uploadedUrl ? (
                  // Uploaded Success Indicator
                  <View style={styles.successRow}>
                    <MaterialCommunityIcons name="check-circle" size={20} color={theme.colors.success} />
                    <Text variant="labelLarge" style={[styles.successText, { color: theme.colors.success }]}>
                      Ready to Submit
                    </Text>
                  </View>
                ) : uploadProgress > 0 ? (
                  // In Progress upload percentage
                  <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
                    Uploading: {uploadProgress}%
                  </Text>
                ) : (
                  // Selected but not uploaded
                  <Text variant="labelMedium" style={{ color: theme.colors.placeholder }}>
                    File Selected
                  </Text>
                )}

                <Button 
                  mode="outlined" 
                  compact 
                  onPress={handleChooseFile} 
                  style={styles.changeBtn}
                  labelStyle={styles.changeBtnLabel}
                >
                  Change File
                </Button>
              </View>
            </View>

            {/* Progress Bar for uploads */}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <ProgressBar 
                progress={uploadProgress / 100} 
                color={theme.colors.primary} 
                style={styles.progressBar} 
              />
            )}
          </View>
        )}

        {/* Error Text display */}
        {error && (
          <Text variant="bodySmall" style={[styles.errorText, { color: theme.colors.error }]}>
            {error}
          </Text>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 10,
  },
  unselectedContainer: {
    alignItems: 'center',
  },
  uploadZone: {
    width: '100%',
    height: 100,
    borderRadius: 6,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
  },
  selectedContainer: {
    marginTop: 4,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 6,
    marginRight: 16,
  },
  pdfWrapper: {
    width: 80,
    height: 80,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    padding: 4,
  },
  filenameText: {
    fontSize: 9,
    textAlign: 'center',
    marginTop: 2,
  },
  statusWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  successText: {
    marginLeft: 6,
    fontWeight: 'bold',
  },
  changeBtn: {
    borderRadius: 4,
    marginTop: 4,
  },
  changeBtnLabel: {
    fontSize: 11,
    marginVertical: 2,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginTop: 12,
  },
  errorText: {
    marginTop: 6,
    fontWeight: '600',
  },
});
