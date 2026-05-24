import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, FlatList, KeyboardAvoidingView, Platform, Alert, TextInput as RNTextInput } from 'react-native';
import { Text, IconButton, useTheme, Avatar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';



// Store & Service Imports
import { useAuthStore } from '../../store/authStore';
import { useRequestStore } from '../../store/requestStore';
import { getMessagesListener, sendMessage, getRequestById } from '../../services/requestService';

/**
 * Returns formatted time text: "HH:MM" if today, otherwise "DD MMM HH:MM".
 * 
 * @param {any} ts - Message timestamp.
 * @returns {string} Formatted timestamp text.
 */
const getMessageTime = (ts) => {
  if (!ts) return '';
  let dateObj;
  if (ts && typeof ts.toDate === 'function') {
    dateObj = ts.toDate();
  } else {
    dateObj = new Date(ts);
  }
  const now = new Date();

  const hours = dateObj.getHours().toString().padStart(2, '0');
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  if (dateObj.toDateString() === now.toDateString()) {
    return timeStr;
  }

  const day = dateObj.getDate().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[dateObj.getMonth()];
  return `${day} ${month} ${timeStr}`;
};

/**
 * Returns day group separator: "Today", "Yesterday", or "DD MMM YYYY".
 * 
 * @param {any} ts - Message timestamp.
 * @returns {string} Separator date string.
 */
const getDividerText = (ts) => {
  if (!ts) return '';
  let dateObj;
  if (ts && typeof ts.toDate === 'function') {
    dateObj = ts.toDate();
  } else {
    dateObj = new Date(ts);
  }
  const now = new Date();

  if (dateObj.toDateString() === now.toDateString()) {
    return 'Today';
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dateObj.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  const day = dateObj.getDate().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  return `${day} ${month} ${year}`;
};

/**
 * PassengerCommScreen component.
 * Facilitates live messaging chat between passengers and support staff.
 * Features inverted message FlatLists, custom bubble alignments based on sender identity,
 * scroll to bottom defaults, and multiline inputs.
 * 
 * @param {Object} props - React Navigation props.
 * @param {Object} props.route - Route state and parameters.
 * @param {Object} props.navigation - Navigation controller.
 * @returns {React.JSX.Element} PassengerCommScreen layout.
 */
export default function PassengerCommScreen({ route, navigation }) {
  const { requestId, passengerName } = route.params || {};
  const theme = useTheme();
  const insets = useSafeAreaInsets();


  const { user, userProfile } = useAuthStore();
  const { messages, setMessages, addUnsubscribe, cleanupListeners } = useRequestStore();

  const [inputText, setInputText] = useState('');
  const [request, setRequest] = useState(null);

  // Keep a reference of flatlist to scroll
  const flatListRef = useRef(null);

  // Fetch request status on mount for header badge
  useEffect(() => {
    if (!requestId) return;
    getRequestById(requestId)
      .then((data) => setRequest(data))
      .catch((err) => console.error('Error fetching request for chat header:', err));
  }, [requestId]);

  // Subscribe to message threads
  useEffect(() => {
    if (!requestId) return;

    const unsubscribe = getMessagesListener(requestId, (data) => {
      // Invert list so newest elements render at bottom in an inverted FlatList
      const inverted = [...data].reverse();
      setMessages(inverted);
    });

    addUnsubscribe(unsubscribe);

    return () => {
      cleanupListeners();
    };
  }, [requestId]);

  // Set navigation header dynamically
  useEffect(() => {
    if (passengerName) {
      navigation.setOptions({
        headerTitle: () => (
          <View style={{ justifyContent: 'center' }}>
            <Text variant="titleMedium" style={{ color: theme.colors.onPrimary, fontWeight: 'bold' }}>
              {passengerName}
            </Text>
            {request?.status ? (
              <Text variant="bodySmall" style={{ color: theme.colors.onPrimary + 'B0', fontSize: 10, marginTop: -2 }}>
                Status: {request.status}
              </Text>
            ) : null}
          </View>
        ),
      });
    }
  }, [navigation, passengerName, request, theme]);

  // Handle message sending
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !requestId || !user?.uid) return;
    if (request?.status === 'Completed' || request?.status === 'Cancelled') {
      Alert.alert('Chat Closed', 'This assistance request is closed, so its chat is no longer available.');
      return;
    }

    try {
      setInputText('');
      const senderName = userProfile?.name || 'Staff Member';
      const senderRole = userProfile?.role || 'staff';
      // Call service: sendMessage(requestId, senderId, senderName, senderRole, text)
      await sendMessage(requestId, user.uid, senderName, senderRole, text);
    } catch (err) {
      console.error('Error sending chat message:', err);
      Alert.alert('Send Error', 'Could not send message. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >

      {/* Messages Stream */}
      <FlatList
        ref={flatListRef}
        inverted
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Avatar.Icon 
              size={64} 
              icon="forum-outline" 
              style={{ backgroundColor: theme.colors.primary + '12' }} 
              color={theme.colors.primary} 
            />
            <Text variant="titleMedium" style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
              Start the Conversation
            </Text>
            <Text variant="bodyMedium" style={[styles.emptyText, { color: theme.colors.placeholder }]}>
              Send a message below to coordinate assistance details. The chat is secure and private.
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          // Check sender identity
          const isMine = item.senderId === user?.uid;
          const nextMsg = messages[index + 1]; // older message in list
          const prevMsg = messages[index - 1]; // newer message in list

          const dateCurrent = item.timestamp ? (item.timestamp.toDate ? item.timestamp.toDate() : new Date(item.timestamp)) : new Date();
          const dateNext = nextMsg?.timestamp ? (nextMsg.timestamp.toDate ? nextMsg.timestamp.toDate() : new Date(nextMsg.timestamp)) : null;
          const datePrev = prevMsg?.timestamp ? (prevMsg.timestamp.toDate ? prevMsg.timestamp.toDate() : new Date(prevMsg.timestamp)) : null;

          const isConsecutive = !!nextMsg && nextMsg.senderId === item.senderId && (!dateNext || Math.abs(dateCurrent - dateNext) / 60000 < 3);
          const isFollowedByNewer = !!prevMsg && prevMsg.senderId === item.senderId && (!datePrev || Math.abs(dateCurrent - datePrev) / 60000 < 3);

          // Determine if we show date divider
          let showDivider = false;
          if (!nextMsg) {
            showDivider = true;
          } else if (item.timestamp && nextMsg.timestamp) {
            const dateCurrentOnly = item.timestamp?.toDate ? item.timestamp.toDate() : new Date(item.timestamp);
            const dateNextOnly = nextMsg.timestamp?.toDate ? nextMsg.timestamp.toDate() : new Date(nextMsg.timestamp);
            if (dateCurrentOnly.toDateString() !== dateNextOnly.toDateString()) {
              showDivider = true;
            }
          }

          return (
            <View style={[styles.messageRow, { marginBottom: isFollowedByNewer ? 3 : 12 }]}>
              {showDivider && item.timestamp && (
                <View style={styles.dividerWrapper}>
                  <View style={[styles.dividerLine, { backgroundColor: theme.colors.outline + '15' }]} />
                  <View style={[styles.dividerBadge, { backgroundColor: theme.colors.background }]}>
                    <Text variant="bodySmall" style={[styles.dividerText, { color: theme.colors.placeholder }]}>
                      {getDividerText(item.timestamp)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Message Bubble Container */}
              <View style={[styles.bubbleWrapper, isMine ? styles.bubbleRight : styles.bubbleLeft]}>
                {/* Sender Name (only show for others and when not consecutive) */}
                {(!isMine && !isConsecutive) && (
                  <Text variant="bodySmall" style={[styles.senderName, { color: theme.colors.primary, marginBottom: 2 }]}>
                    {item.senderName}
                  </Text>
                )}
                
                {/* Bubble content */}
                <View 
                  style={[
                    styles.bubble, 
                    { 
                      backgroundColor: isMine ? theme.colors.primary : theme.colors.surfaceVariant,
                      borderTopLeftRadius: 16,
                      borderTopRightRadius: 16,
                      borderBottomRightRadius: isMine ? (isFollowedByNewer ? 16 : 4) : 16,
                      borderBottomLeftRadius: isMine ? 16 : (isFollowedByNewer ? 16 : 4),
                    }
                  ]}
                >
                  <Text 
                    style={[
                      styles.msgText, 
                      { color: isMine ? theme.colors.onPrimary : theme.colors.onSurfaceVariant }
                    ]}
                  >
                    {item.text}
                  </Text>

                  {/* Time */}
                  {item.timestamp && (
                    <Text 
                      variant="bodySmall" 
                      style={[
                        styles.timeText, 
                        { 
                          color: isMine ? theme.colors.onPrimary + 'A0' : theme.colors.onSurfaceVariant + 'A0',
                          alignSelf: 'flex-end',
                          marginTop: 4,
                        }
                      ]}
                    >
                      {getMessageTime(item.timestamp)}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          );
        }}
      />

      <View 
        style={[
          styles.inputBar, 
          { 
            borderTopColor: theme.colors.outline + '15', 
            backgroundColor: theme.colors.surface,
            paddingBottom: Math.max(insets.bottom, 10),
          }
        ]}
      >

        {request?.status === 'Completed' || request?.status === 'Cancelled' ? (
          <Text variant="bodyMedium" style={[styles.closedText, { color: theme.colors.placeholder }]}>
            This chat was closed after assistance completion.
          </Text>
        ) : (
          <View style={styles.inputContainer}>
            <View style={[styles.pillContainer, { backgroundColor: theme.colors.surfaceVariant + '25', borderColor: theme.colors.outline + '15' }]}>
              <RNTextInput
                placeholder="Type your message..."
                placeholderTextColor={theme.colors.placeholder}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={300}
                style={[styles.customTextInput, { color: theme.colors.onSurface }]}
              />
            </View>
            <View style={[styles.sendBtnContainer, { backgroundColor: inputText.trim() ? theme.colors.primary : theme.colors.surfaceVariant + '60' }]}>
              <IconButton
                icon="send"
                iconColor={inputText.trim() ? theme.colors.onPrimary : theme.colors.outline}
                disabled={!inputText.trim()}
                size={20}
                onPress={handleSend}
                style={styles.sendBtn}
              />
            </View>
          </View>
        )}
      </View>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 120,
  },
  emptyTitle: {
    fontWeight: 'bold',
    marginTop: 16,
    fontSize: 16,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 13,
    paddingHorizontal: 40,
    lineHeight: 18,
  },
  messageRow: {
    marginBottom: 12,
  },
  dividerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },

  dividerLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
  },
  dividerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  bubbleWrapper: {
    maxWidth: '80%',
    flexDirection: 'column',
  },
  bubbleLeft: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubbleRight: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  senderName: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
    marginLeft: 4,
  },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  msgText: {
    fontSize: 14,
    lineHeight: 20,
  },
  timeText: {
    fontSize: 9,
    marginTop: 2,
    fontWeight: '500',
  },
  inputBar: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  pillContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    minHeight: 40,
    maxHeight: 100,
  },
  customTextInput: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    paddingTop: Platform.OS === 'ios' ? 4 : 0,
    paddingBottom: Platform.OS === 'ios' ? 4 : 0,
    margin: 0,
  },
  sendBtnContainer: {
    borderRadius: 20,
    marginLeft: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtn: {
    margin: 0,
  },
  closedText: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
    paddingVertical: 10,
  },
});

