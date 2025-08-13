import * as React from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaView, StyleSheet } from 'react-native';
import PayslipForm from './components/PayslipForm';

export default function App() {
  return (
    <PaperProvider>
      <SafeAreaView style={styles.container}>
        <PayslipForm />
      </SafeAreaView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
});
