// components/PayslipForm.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  TextInput,
  Button,
  Title,
  Card,
  HelperText,
  Divider,
} from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAndSharePdf } from "../utils/pdfHandler";
import generatePayslipHTML, { PayslipPayload } from "../utils/generatePayslipHTML";
import DateTimePicker from "@react-native-community/datetimepicker";

const EMP_STORE_KEY = "EMPLOYEE_STORE_V1";

const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

export default function PayslipForm() {
  // Employee details
  const [employeeId, setEmployeeId] = useState("");
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [month, setMonth] = useState("August");
  const [year, setYear] = useState(String(new Date().getFullYear()));

  // Month picker
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const onMonthYearChange = (_: any, selectedDate?: Date) => {
    setShowMonthPicker(false);
    if (selectedDate) {
      setMonth(months[selectedDate.getMonth()]);
      setYear(String(selectedDate.getFullYear()));
    }
  };

  // Attendance & wages
  const [grossWages, setGrossWages] = useState("0");
  const [totalWorkingDays, setTotalWorkingDays] = useState("0");
  const [lopDays, setLopDays] = useState("0");
  const [leavesTaken, setLeavesTaken] = useState("0");

  // Earnings
  const [basic, setBasic] = useState("0");
  const [hra, setHra] = useState("0");
  const [conveyance, setConveyance] = useState("0");
  const [medical, setMedical] = useState("0");
  const [attendanceIncentive, setAttendanceIncentive] = useState("0");
  const [festivalBonus, setFestivalBonus] = useState("0");
  const [otherAllowance, setOtherAllowance] = useState("0");

  // Deductions
  const [epf, setEpf] = useState("0");
  const [esi, setEsi] = useState("0");
  const [professionalTax, setProfessionalTax] = useState("0");
  const [welfareFund, setWelfareFund] = useState("0");
  const [insurance, setInsurance] = useState("0");
  const [advance, setAdvance] = useState("0");

  // Autofill from storage by ID
  useEffect(() => {
    const id = employeeId.trim();
    if (!id) return;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(EMP_STORE_KEY);
        if (!raw) return;
        const store: Record<string, any> = JSON.parse(raw);
        const rec = store[id];
        if (rec) {
          setName(rec.name || "");
          setDesignation(rec.designation || "");
          setDepartment(rec.department || "");
        }
      } catch {}
    })();
  }, [employeeId]);

  // Autofill from storage by name
  useEffect(() => {
    const nm = name.trim();
    if (!nm || employeeId.trim()) return;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(EMP_STORE_KEY);
        if (!raw) return;
        const store: Record<string, any> = JSON.parse(raw);
        const found = Object.values(store).find(
          (r: any) => (r.name || "").toLowerCase() === nm.toLowerCase()
        );
        if (found) {
          setEmployeeId(found.id || "");
          setDesignation(found.designation || "");
          setDepartment(found.department || "");
        }
      } catch {}
    })();
  }, [name]);

  // Helper functions
  const toNum = (v: string) => {
    const n = Number((v || "0").toString().replace(/,/g, ""));
    return isNaN(n) ? 0 : n;
  };
  const fmt = (n: number) =>
    n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const totals = useMemo(() => {
    const earnings =
      toNum(basic) +
      toNum(hra) +
      toNum(conveyance) +
      toNum(medical) +
      toNum(attendanceIncentive) +
      toNum(festivalBonus) +
      toNum(otherAllowance);
    const deductions =
      toNum(epf) +
      toNum(esi) +
      toNum(professionalTax) +
      toNum(welfareFund) +
      toNum(insurance) +
      toNum(advance);
    const net = earnings - deductions;
    const paidDays = Math.max(0, toNum(totalWorkingDays) - toNum(leavesTaken));
    return { earnings, deductions, net, paidDays };
  }, [
    basic, hra, conveyance, medical, attendanceIncentive, festivalBonus, otherAllowance,
    epf, esi, professionalTax, welfareFund, insurance, advance,
    totalWorkingDays, leavesTaken,
  ]);

  const saveEmployeeRecord = async () => {
    const id = employeeId.trim();
    const nm = name.trim();
    if (!id || !nm) return;
    try {
      const raw = await AsyncStorage.getItem(EMP_STORE_KEY);
      const store: Record<string, any> = raw ? JSON.parse(raw) : {};
      store[id] = { id, name: nm, designation, department };
      await AsyncStorage.setItem(EMP_STORE_KEY, JSON.stringify(store));
    } catch {}
  };

  const onGenerate = async (opts?: { share?: boolean; email?: boolean }) => {
    if (!employeeId.trim() || !name.trim()) {
      Alert.alert("Missing", "Please enter Employee ID and Name.");
      return;
    }

    const payload: PayslipPayload = {
      companyName: "Source One",
      companyAddress: "",
      month: `${month} ${year}`,
      date: new Date().toISOString().slice(0, 10),
      employeeId: employeeId.trim(),
      name: name.trim(),
      designation,
      department,
      grossWages: toNum(grossWages),
      totalWorkingDays: Math.round(toNum(totalWorkingDays)),
      lopDays: Math.round(toNum(lopDays)),
      leavesTaken: Math.round(toNum(leavesTaken)),
      basic: toNum(basic),
      hra: toNum(hra),
      conveyance: toNum(conveyance),
      medical: toNum(medical),
      attendanceIncentive: toNum(attendanceIncentive),
      festivalBonus: toNum(festivalBonus),
      otherAllowance: toNum(otherAllowance),
      epf: toNum(epf),
      esi: toNum(esi),
      professionalTax: toNum(professionalTax),
      welfareFund: toNum(welfareFund),
      insurance: toNum(insurance),
      advance: toNum(advance),
      totalEarnings: totals.earnings,
      totalDeductions: totals.deductions,
      netSalary: totals.net,
    };

    try {
      await saveEmployeeRecord();
      const html = await generatePayslipHTML(payload);
      const savedUri = await createAndSharePdf({
        html,
        name: payload.name,
        share: opts?.share ?? true,
        email: opts?.email ?? false,
      });
      Alert.alert("Saved", `PDF saved: ${savedUri}`);
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", err?.message || "Failed to generate PDF");
    }
  };

  const onReset = () => {
    setEmployeeId("");
    setName("");
    setDesignation("");
    setDepartment("");
    setMonth(months[new Date().getMonth()]);
    setYear(String(new Date().getFullYear()));
    setGrossWages("0");
    setTotalWorkingDays("0");
    setLopDays("0");
    setLeavesTaken("0");
    setBasic("0");
    setHra("0");
    setConveyance("0");
    setMedical("0");
    setAttendanceIncentive("0");
    setFestivalBonus("0");
    setOtherAllowance("0");
    setEpf("0");
    setEsi("0");
    setProfessionalTax("0");
    setWelfareFund("0");
    setInsurance("0");
    setAdvance("0");
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Title style={styles.title}>Payslip Generator</Title>

        {/* Employee Details */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.row}>
              <TextInput label="Employee ID" value={employeeId} onChangeText={setEmployeeId} style={styles.flexInput} mode="outlined" />
              <TextInput label="Name" value={name} onChangeText={setName} style={styles.flexInput} mode="outlined" />
            </View>

            <View style={[styles.row, styles.mt8]}>
              <TextInput label="Designation" value={designation} onChangeText={setDesignation} style={styles.flexInput} mode="outlined" />
              <TextInput label="Department" value={department} onChangeText={setDepartment} style={styles.flexInput} mode="outlined" />
            </View>

            {/* Month Picker */}
            <View style={[styles.row, styles.mt8]}>
              <Button
                mode="outlined"
                onPress={() => setShowMonthPicker(true)}
                style={styles.flexButton}
              >
                {month} {year}
              </Button>
            </View>

            {showMonthPicker && (
              <DateTimePicker
                value={new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, selectedDate) => {
                  if (Platform.OS === "ios") {
                    if (event.type === "set" && selectedDate) {
                      setMonth(months[selectedDate.getMonth()]);
                      setYear(String(selectedDate.getFullYear()));
                    }
                    setShowMonthPicker(false);
                  } else {
                    if (selectedDate) {
                      setMonth(months[selectedDate.getMonth()]);
                      setYear(String(selectedDate.getFullYear()));
                    }
                    setShowMonthPicker(false);
                  }
                }}
              />
            )}
          </Card.Content>
        </Card>

        {/* Attendance & Wages */}
        <Card style={styles.card}>
          <Card.Title title="Attendance & Wages" />
          <Card.Content>
            <View style={styles.row}>
              <TextInput label="Gross Wages" value={grossWages} onChangeText={setGrossWages} style={styles.flexInput} keyboardType="numeric" mode="outlined" />
              <TextInput label="Total Working Days" value={totalWorkingDays} onChangeText={setTotalWorkingDays} style={styles.w180} keyboardType="numeric" mode="outlined" />
            </View>
            <View style={[styles.row, styles.mt8]}>
              <TextInput label="LOP Days" value={lopDays} onChangeText={setLopDays} style={styles.flexInput} keyboardType="numeric" mode="outlined" />
              <TextInput label="Leaves Taken" value={leavesTaken} onChangeText={setLeavesTaken} style={styles.w150} keyboardType="numeric" mode="outlined" />
            </View>
            <HelperText type="info">Paid Leaves: {totals.paidDays}</HelperText>
          </Card.Content>
        </Card>

        {/* Earnings */}
        <Card style={styles.card}>
          <Card.Title title="Earnings" />
          <Card.Content>
            <View style={styles.row}>
              <TextInput label="Basic" value={basic} onChangeText={setBasic} style={styles.flexInput} mode="outlined" keyboardType="numeric" />
              <TextInput label="HRA" value={hra} onChangeText={setHra} style={styles.w120} mode="outlined" keyboardType="numeric" />
            </View>

            <View style={[styles.row, styles.mt8]}>
              <TextInput label="Conveyance" value={conveyance} onChangeText={setConveyance} style={styles.flexInput} mode="outlined" keyboardType="numeric" />
              <TextInput label="Medical" value={medical} onChangeText={setMedical} style={styles.w120} mode="outlined" keyboardType="numeric" />
            </View>

            <View style={[styles.row, styles.mt8]}>
              <TextInput label="Attendance Incentive" value={attendanceIncentive} onChangeText={setAttendanceIncentive} style={styles.flexInput} mode="outlined" keyboardType="numeric" />
              <TextInput label="Festival Bonus" value={festivalBonus} onChangeText={setFestivalBonus} style={styles.w160} mode="outlined" keyboardType="numeric" />
            </View>

            <TextInput label="Other Allowance" value={otherAllowance} onChangeText={setOtherAllowance} mode="outlined" keyboardType="numeric" style={styles.mt8} />
            <Divider style={styles.mv8} />
            <HelperText  type="info">Total Earnings: ₹ {fmt(totals.earnings)}</HelperText>
          </Card.Content>
        </Card>

        {/* Deductions */}
        <Card style={styles.card}>
          <Card.Title title="Deductions" />
          <Card.Content>
            <View style={styles.row}>
              <TextInput label="EPF" value={epf} onChangeText={setEpf} style={styles.flexInput} mode="outlined" keyboardType="numeric" />
              <TextInput label="ESI" value={esi} onChangeText={setEsi} style={styles.w120} mode="outlined" keyboardType="numeric" />
            </View>

            <View style={[styles.row, styles.mt8]}>
              <TextInput label="Professional Tax" value={professionalTax} onChangeText={setProfessionalTax} style={styles.flexInput} mode="outlined" keyboardType="numeric" />
              <TextInput label="Welfare Fund" value={welfareFund} onChangeText={setWelfareFund} style={styles.w160} mode="outlined" keyboardType="numeric" />
            </View>

            <View style={[styles.row, styles.mt8]}>
              <TextInput label="Insurance" value={insurance} onChangeText={setInsurance} style={styles.flexInput} mode="outlined" keyboardType="numeric" />
              <TextInput label="Advance" value={advance} onChangeText={setAdvance} style={styles.w120} mode="outlined" keyboardType="numeric" />
            </View>

            <Divider style={styles.mv8} />
            <HelperText  type="info">Total Deductions: ₹ {fmt(totals.deductions)}</HelperText>
          </Card.Content>
        </Card>

        {/* Net Salary */}
        <Card style={[styles.card, styles.netCard]}>
          <HelperText  type="info" style={styles.netTitle}>Net Salary</HelperText>
          <HelperText  type="info" style={styles.netAmount}>₹ {fmt(totals.net)}</HelperText>
        </Card>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <Button mode="contained" onPress={() => onGenerate({ share: true })} style={styles.generateBtn}>
            Generate & Share
          </Button>
          <Button mode="outlined" onPress={onReset}>
            Reset Form
          </Button>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 12 },
  card: { marginBottom: 12 },
  flexInput: { flex: 1 },
  title: { marginBottom: 8, textAlign: "center" },
  row: { flexDirection: "row", gap: 8 },
  mt8: { marginTop: 8 },
  w120: { width: 120 },
  w150: { width: 150 },
  w160: { width: 160 },
  w180: { width: 180 },
  flexButton: { flex: 1, justifyContent: "center" },
  mv8: { marginVertical: 8 },
  netCard: { alignItems: 'flex-start', padding: 12 },
  netTitle: { fontWeight: "700",},
  netAmount: { fontSize: 20, fontWeight: "800", marginTop: 8 },
  buttonRow: { flexDirection: "row", gap: 50, marginTop: 8, justifyContent: "center" },
  generateBtn: { marginBottom: 8 , width: 200 },
});
