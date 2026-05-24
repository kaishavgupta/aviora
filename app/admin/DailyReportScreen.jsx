import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, Dimensions } from 'react-native';
import { Text, Card, Button, useTheme, ActivityIndicator, Snackbar, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Store & Service Imports
import { useAuthStore } from '../../store/authStore';
import { getTodayRequests } from '../../services/requestService';
import { STATUS_COLORS } from '../../constants/statusFlow';

// Responsive width helper
const screenWidth = Dimensions.get('window').width;

/**
 * Custom Bar Chart component rendered using pure React Native components.
 * Guarantees compilation stability while maintaining styling and matching theme colors.
 * 
 * @param {Object} props - Component properties.
 * @param {Array<Object>} props.data - Chart bars data array ({ label, count, color }).
 * @returns {React.JSX.Element} The custom bar chart.
 */
function CustomBarChart({ data }) {
  const theme = useTheme();
  const maxVal = Math.max(...data.map((d) => d.count), 1); // Avoid division by zero

  return (
    <Card style={styles.chartCard} elevation={1}>
      <Card.Content>
        <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 16 }}>
          Requests by Status
        </Text>
        
        <View style={styles.chartBody}>
          <View style={styles.barsContainer}>
            {data.map((item, idx) => {
              // Calculate relative height out of 120 pixels
              const barHeight = (item.count / maxVal) * 110;

              return (
                <View key={idx} style={styles.barColumn}>
                  {/* Count Label */}
                  <Text variant="labelSmall" style={[styles.barVal, { color: theme.colors.onSurfaceVariant }]}>
                    {item.count}
                  </Text>
                  
                  {/* Bar */}
                  <View 
                    style={[
                      styles.bar, 
                      { 
                        height: Math.max(barHeight, 4), // Min height 4 for visual line
                        backgroundColor: item.color 
                      }
                    ]} 
                  />
                  
                  {/* Axis Label */}
                  <Text variant="labelSmall" style={[styles.axisLabel, { color: theme.colors.placeholder }]} numberOfLines={1}>
                    {item.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </Card.Content>
    </Card>
  );
}

/**
 * DailyReportScreen component.
 * Displays daily operational metrics for administrators.
 * Features grid total/status cards, status bar chart configurations, completed/cancelled lists,
 * pull refreshes, and mockup export triggers.
 * 
 * @param {Object} props - React Navigation props.
 * @param {Object} props.navigation - Navigation controller.
 * @returns {React.JSX.Element} DailyReportScreen layout.
 */
export default function DailyReportScreen({ navigation }) {
  const theme = useTheme();
  const role = useAuthStore((state) => state.role);
  const isAdmin = role === 'admin';
  
  const [loading, setLoading] = useState(true);
  const [exportVisible, setExportVisible] = useState(false);
  const [report, setReport] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    cancelled: 0,
    chartData: [],
    completedToday: [],
    cancelledToday: [],
  });

  // Calculate formatted today date string
  const getFormattedDate = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const now = new Date();

    const dayName = days[now.getDay()];
    const date = now.getDate();
    const monthName = months[now.getMonth()];
    const year = now.getFullYear();

    return `${dayName}, ${date} ${monthName} ${year}`;
  };

  // Extract completed/cancelled time string
  const getStatusTime = (req, targetStatus) => {
    const history = req.statusHistory || [];
    const item = history.find((h) => h.status === targetStatus);
    if (item && item.timestamp) {
      const dateObj = item.timestamp.toDate ? item.timestamp.toDate() : new Date(item.timestamp);
      return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return '';
  };

  // Load and calculate report metrics from Firestore
  const loadReport = async () => {
    setLoading(true);
    try {
      const todayReqs = await getTodayRequests();
      
      let completedCount = 0;
      let cancelledCount = 0;
      let inProgressCount = 0;

      const counts = {
        'New Request': 0,
        'Under Review': 0,
        'Staff Assigned': 0,
        'Passenger Contacted': 0,
        'Assistance In Progress': 0,
        'Completed': 0,
        'Cancelled': 0,
      };

      const completedList = [];
      const cancelledList = [];

      todayReqs.forEach((req) => {
        const status = req.status || 'New Request';
        if (counts[status] !== undefined) {
          counts[status]++;
        }

        if (status === 'Completed') {
          completedCount++;
          completedList.push(req);
        } else if (status === 'Cancelled') {
          cancelledCount++;
          cancelledList.push(req);
        } else {
          inProgressCount++;
        }
      });

      // Prepare abbreviated data for Bar chart
      const chart = [
        { label: 'New', count: counts['New Request'], color: STATUS_COLORS['New Request'].text },
        { label: 'Review', count: counts['Under Review'], color: STATUS_COLORS['Under Review'].text },
        { label: 'Assigned', count: counts['Staff Assigned'], color: STATUS_COLORS['Staff Assigned'].text },
        { label: 'Contact', count: counts['Passenger Contacted'], color: STATUS_COLORS['Passenger Contacted'].text },
        { label: 'Active', count: counts['Assistance In Progress'], color: STATUS_COLORS['Assistance In Progress'].text },
        { label: 'Done', count: counts['Completed'], color: STATUS_COLORS['Completed'].text },
        { label: 'Cancel', count: counts['Cancelled'], color: STATUS_COLORS['Cancelled'].text },
      ];

      setReport({
        total: todayReqs.length,
        completed: completedCount,
        inProgress: inProgressCount,
        cancelled: cancelledCount,
        chartData: chart,
        completedToday: completedList,
        cancelledToday: cancelledList,
      });
    } catch (err) {
      console.error('Error generating daily report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadReport();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  // Configure navigation header with reload button dynamically
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <IconButton
          icon="refresh"
          iconColor={theme.colors.onPrimary}
          size={22}
          onPress={loadReport}
        />
      ),
    });
  }, [navigation, theme]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="lock-outline" size={64} color={theme.colors.error} />
        <Text variant="headlineSmall" style={{ marginTop: 12, fontWeight: 'bold' }}>
          Admin Access Required
        </Text>
        <Text variant="bodyMedium" style={{ marginTop: 8, textAlign: 'center' }}>
          Reports are available only to administrators.
        </Text>
        <Button mode="contained" style={{ marginTop: 16 }} onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Title Date Header */}
        <View style={styles.header}>
          <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>
            Operations Summary
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.placeholder, marginTop: 4 }}>
            {getFormattedDate()}
          </Text>
        </View>

        {/* 2x2 Summary Stats Grid */}
        <View style={styles.grid}>
          <View style={styles.gridRow}>
            {/* Card 1: Total */}
            <Card style={[styles.gridCard, { backgroundColor: theme.colors.primary + '10' }]} elevation={0}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.cardHeaderRow}>
                  <Text variant="headlineLarge" style={[styles.statNum, { color: theme.colors.primary }]}>
                    {report.total}
                  </Text>
                  <MaterialCommunityIcons name="clipboard-text-outline" size={24} color={theme.colors.primary} />
                </View>
                <Text variant="bodyMedium" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Total Requests
                </Text>
              </Card.Content>
            </Card>

            {/* Card 2: Completed */}
            <Card style={[styles.gridCard, { backgroundColor: theme.colors.success + '10' }]} elevation={0}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.cardHeaderRow}>
                  <Text variant="headlineLarge" style={[styles.statNum, { color: theme.colors.success }]}>
                    {report.completed}
                  </Text>
                  <MaterialCommunityIcons name="check-decagram-outline" size={24} color={theme.colors.success} />
                </View>
                <Text variant="bodyMedium" style={[styles.statLabel, { color: theme.colors.success }]}>
                  Completed Today
                </Text>
              </Card.Content>
            </Card>
          </View>

          <View style={[styles.gridRow, { marginTop: 12 }]}>
            {/* Card 3: In Progress */}
            <Card style={[styles.gridCard, { backgroundColor: theme.colors.warning + '10' }]} elevation={0}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.cardHeaderRow}>
                  <Text variant="headlineLarge" style={[styles.statNum, { color: theme.colors.warning }]}>
                    {report.inProgress}
                  </Text>
                  <MaterialCommunityIcons name="progress-clock" size={24} color={theme.colors.warning} />
                </View>
                <Text variant="bodyMedium" style={[styles.statLabel, { color: theme.colors.warning }]}>
                  In Progress
                </Text>
              </Card.Content>
            </Card>

            {/* Card 4: Cancelled */}
            <Card style={[styles.gridCard, { backgroundColor: theme.colors.error + '10' }]} elevation={0}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.cardHeaderRow}>
                  <Text variant="headlineLarge" style={[styles.statNum, { color: theme.colors.error }]}>
                    {report.cancelled}
                  </Text>
                  <MaterialCommunityIcons name="close-circle-outline" size={24} color={theme.colors.error} />
                </View>
                <Text variant="bodyMedium" style={[styles.statLabel, { color: theme.colors.error }]}>
                  Cancelled Today
                </Text>
              </Card.Content>
            </Card>
          </View>
        </View>

        {/* Custom Bar Chart Section */}
        {report.chartData.length > 0 && (
          <CustomBarChart data={report.chartData} />
        )}

        {/* Completed Today List */}
        <Text variant="titleMedium" style={styles.sectionHeader}>
          Completed Today ({report.completedToday.length})
        </Text>
        {report.completedToday.length === 0 ? (
          <Card style={[styles.emptyListCard, { borderColor: theme.colors.border }]} elevation={0}>
            <Card.Content>
              <Text style={{ color: theme.colors.placeholder, fontStyle: 'italic', textAlign: 'center' }}>
                No completed requests today
              </Text>
            </Card.Content>
          </Card>
        ) : (
          report.completedToday.map((req) => (
            <Card key={req.id} style={styles.miniCard} elevation={1}>
              <Card.Content style={styles.miniContent}>
                <View style={styles.miniLeft}>
                  <Text variant="bodyLarge" style={{ fontWeight: 'bold' }}>{req.passengerName}</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.placeholder, marginTop: 2 }}>
                    Type: {req.assistanceType} • Flight {req.flightNumber}
                  </Text>
                </View>
                <View style={styles.miniRight}>
                  <MaterialCommunityIcons name="clock-outline" size={14} color={theme.colors.success} />
                  <Text style={[styles.timeText, { color: theme.colors.success }]}>
                    {getStatusTime(req, 'Completed')}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          ))
        )}

        {/* Cancelled Today List */}
        <Text variant="titleMedium" style={styles.sectionHeader}>
          Cancelled Today ({report.cancelledToday.length})
        </Text>
        {report.cancelledToday.length === 0 ? (
          <Card style={[styles.emptyListCard, { borderColor: theme.colors.border }]} elevation={0}>
            <Card.Content>
              <Text style={{ color: theme.colors.placeholder, fontStyle: 'italic', textAlign: 'center' }}>
                No cancellations today
              </Text>
            </Card.Content>
          </Card>
        ) : (
          report.cancelledToday.map((req) => (
            <Card key={req.id} style={styles.miniCard} elevation={1}>
              <Card.Content style={styles.miniContent}>
                <View style={styles.miniLeft}>
                  <Text variant="bodyLarge" style={{ fontWeight: 'bold' }}>{req.passengerName}</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.placeholder, marginTop: 2 }}>
                    Type: {req.assistanceType} • Flight {req.flightNumber}
                  </Text>
                </View>
                <View style={styles.miniRight}>
                  <MaterialCommunityIcons name="clock-outline" size={14} color={theme.colors.error} />
                  <Text style={[styles.timeText, { color: theme.colors.error }]}> 
                    {getStatusTime(req, 'Cancelled')}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          ))
        )}

        {/* Export Button */}
        <Button
          mode="outlined"
          style={styles.exportBtn}
          icon="file-export-outline"
          onPress={() => setExportVisible(true)}
        >
          Export Today's Report
        </Button>
      </ScrollView>

      {/* Snackbar Alert Mockup */}
      <Snackbar
        visible={exportVisible}
        onDismiss={() => setExportVisible(false)}
        duration={2500}
        action={{ label: 'Dismiss', onPress: () => setExportVisible(false) }}
      >
        Export feature coming soon!
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  grid: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridCard: {
    flex: 0.48,
    borderRadius: 8,
  },
  cardContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statNum: {
    fontWeight: 'bold',
    fontSize: 28,
  },
  statLabel: {
    fontSize: 12.5,
    marginTop: 6,
    fontWeight: '600',
  },
  chartCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  chartBody: {
    flexDirection: 'row',
    height: 150,
    alignItems: 'flex-end',
    paddingBottom: 8,
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: '100%',
    paddingHorizontal: 4,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barVal: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  bar: {
    width: 24,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  axisLabel: {
    fontSize: 8.5,
    marginTop: 4,
    fontWeight: 'bold',
  },
  sectionHeader: {
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 10,
  },
  emptyListCard: {
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    
  },
  miniCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  miniContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  miniLeft: {
    flex: 1,
    paddingRight: 10,
  },
  miniRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  exportBtn: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 8,
  },
});
