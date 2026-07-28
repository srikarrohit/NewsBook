import { useMemo, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function LocationSelect({ label, value, options, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');

  const filteredOptions = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return options;
    return options.filter((o) => o.toLowerCase().includes(query));
  }, [options, filter]);

  const close = () => {
    setOpen(false);
    setFilter('');
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.field, disabled && styles.fieldDisabled]}
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
      >
        <Text style={value ? styles.fieldValue : styles.fieldPlaceholder}>{value || label}</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={close}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <TextInput
              style={styles.search}
              placeholder="Search..."
              value={filter}
              onChangeText={setFilter}
              autoCapitalize="none"
            />
            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => {
                    onChange(item);
                    close();
                  }}
                >
                  <Text style={styles.optionText}>{item}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No matches.</Text>}
              style={styles.list}
            />
            <TouchableOpacity style={styles.cancelButton} onPress={close}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: { backgroundColor: '#f0f4ff', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#d9e2ec' },
  fieldDisabled: { opacity: 0.6 },
  fieldValue: { fontSize: 16, color: '#102a43' },
  fieldPlaceholder: { fontSize: 16, color: '#7b8794' },
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '75%' },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#102a43', marginBottom: 12 },
  search: { backgroundColor: '#f0f4ff', borderRadius: 14, padding: 12, fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: '#d9e2ec' },
  list: { marginBottom: 8 },
  option: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eef2f7' },
  optionText: { fontSize: 15, color: '#334e68' },
  emptyText: { color: '#7b8794', fontSize: 14, paddingVertical: 12 },
  cancelButton: { alignItems: 'center', paddingVertical: 12 },
  cancelText: { color: '#1d4ed8', fontSize: 15, fontWeight: '700' },
});
