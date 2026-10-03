/**
 * A render-prop wrapper around @react-native-community/datetimepicker that
 * hides the Android-vs-iOS behavior difference the web's single
 * <input type="datetime-local"> never had to deal with: Android only
 * supports a "date" or "time" dialog at a time (so mode="datetime" opens
 * the date dialog, then chains into the time dialog on selection), while
 * iOS needs its own picker kept open in a sheet with explicit Done/Cancel
 * buttons instead of auto-closing on every tick.
 */
import React, {useState} from 'react';
import {Modal, Platform, Pressable, Text, View} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function DateTimePickerField({value, mode = 'date', minimumDate, maximumDate, onChange, children}) {
  const [visible, setVisible] = useState(false);
  const [androidStage, setAndroidStage] = useState('date');
  const [draftDate, setDraftDate] = useState(value || new Date());

  const open = () => {
    setDraftDate(value || new Date());
    setAndroidStage('date');
    setVisible(true);
  };

  if (Platform.OS === 'android') {
    const androidMode = mode === 'datetime' ? androidStage : mode;
    return (
      <>
        {children(open)}
        {visible && (
          <DateTimePicker
            value={draftDate}
            mode={androidMode}
            display="default"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={(event, selected) => {
              if (event.type !== 'set' || !selected) {
                setVisible(false);
                return;
              }
              if (mode === 'datetime' && androidStage === 'date') {
                setDraftDate(selected);
                setAndroidStage('time');
                return;
              }
              setVisible(false);
              onChange(selected);
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      {children(open)}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl px-5 pt-4 pb-8">
            <DateTimePicker
              value={draftDate}
              mode={mode}
              display={mode === 'time' ? 'spinner' : 'inline'}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              onChange={(event, selected) => {
                if (selected) setDraftDate(selected);
              }}
            />
            <View className="flex-row gap-3 mt-3">
              <Pressable onPress={() => setVisible(false)} className="flex-1 py-3 rounded-xl border border-slate-200 items-center">
                <Text className="font-bold text-slate-600">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setVisible(false);
                  onChange(draftDate);
                }}
                className="flex-1 py-3 rounded-xl bg-slate-900 items-center">
                <Text className="font-bold text-white">Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
