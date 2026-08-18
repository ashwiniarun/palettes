import { RADII, SHADOWS } from '@/lib/theme';
import { BlurView } from 'expo-blur';
import { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Wraps native Modal (kept for back-button handling, focus trapping, status
// bar behavior — not worth reinventing) with `visible` driving it directly,
// same as every other modal in this app. The slide/fade motion comes from
// reanimated's built-in entering/exiting animation builders rather than a
// hand-rolled shared-value timeline — much less to get wrong. Note: since
// Modal's own render() returns null the instant `visible` goes false (no
// grace period on Android, none with animationType="none" on iOS either),
// the `exiting` animations won't get a chance to play — closing is an
// immediate cut, matching how every modal in this app behaved before this
// redesign. Opening is the one that's animated.
//
// Anchored to the TOP of the screen, not the bottom — every form here has
// text inputs, and a bottom sheet puts those fields right where the keyboard
// covers them with no keyboard-avoidance wired in. Top-anchoring keeps the
// fields people are actually typing into above the keyboard's reach.

type SheetProps = { visible: boolean; onClose: () => void; children: ReactNode };

export default function Sheet({ visible, onClose, children }: SheetProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  if (!visible) return null;

  // An explicit numeric height, not maxHeight — flex:1 on the children below
  // (clip, content, and the caller's own ScrollView) only resolves correctly
  // against a parent with a determinate height. maxHeight alone doesn't give
  // Yoga that, so the ScrollView inside was never actually getting a bounded
  // box to scroll within — content past the visible area was just
  // unreachable, not scrollable.
  const sheetHeight = (windowHeight - insets.top) * 0.85;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={StyleSheet.absoluteFill}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.dim} />
          </Pressable>
        </Animated.View>

        <Animated.View
          entering={SlideInUp.duration(220)}
          exiting={SlideOutUp.duration(180)}
          style={[styles.sheetOuter, { top: insets.top, height: sheetHeight }]}
        >
          <View style={styles.clip}>
            <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
            <View style={styles.tint} />
            <View style={styles.content}>{children}</View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(54,43,29,0.35)' },
  sheetOuter: {
    position: 'absolute', left: 0, right: 0,
  },
  clip: {
    flex: 1,
    overflow: 'hidden',
    borderBottomLeftRadius: RADII.xl,
    borderBottomRightRadius: RADII.xl,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: SHADOWS.glassBorder,
  },
  tint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(246,229,231,0.78)' },
  content: { flex: 1 },
});
