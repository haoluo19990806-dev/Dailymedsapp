import React, { forwardRef, useCallback, useImperativeHandle } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Easing,
    Extrapolation,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const EDGE_WIDTH = 50;
// 阈值改为 35%
const THRESHOLD = SCREEN_WIDTH * 0.35;
// 快速甩动速度阈值
const VELOCITY_THRESHOLD = 800;

const ANIMATION_CONFIG = {
  duration: 250,
  easing: Easing.out(Easing.cubic),
};

const SPRING_CONFIG = {
  damping: 25,
  stiffness: 300,
  mass: 0.8,
};

export interface SwipeBackContainerRef {
  animateBack: () => void;
}

interface SwipeBackContainerProps {
  children: React.ReactNode;
  previousPage?: React.ReactNode;
  onBack: () => void;
  enabled?: boolean;
  backgroundColor?: string;
  onGestureStart?: () => void;
  onGestureEnd?: (willGoBack: boolean) => void;
}

export const SwipeBackContainer = forwardRef<SwipeBackContainerRef, SwipeBackContainerProps>(
  (props, ref) => {
    const {
      children,
      previousPage,
      onBack,
      enabled = true,
      backgroundColor = '#FFFBF5',
      onGestureStart,
      onGestureEnd,
    } = props;

    const translateX = useSharedValue(0);
    const isGestureActive = useSharedValue(false);
    const startX = useSharedValue(0);

    const triggerBack = useCallback(() => {
      onBack();
    }, [onBack]);

    const triggerGestureStart = useCallback(() => {
      if (onGestureStart) onGestureStart();
    }, [onGestureStart]);

    const triggerGestureEnd = useCallback(
      (willGoBack: boolean) => {
        if (onGestureEnd) onGestureEnd(willGoBack);
      },
      [onGestureEnd]
    );

    useImperativeHandle(
      ref,
      () => ({
        animateBack: () => {
          translateX.value = withTiming(
            SCREEN_WIDTH,
            ANIMATION_CONFIG,
            (finished) => {
              if (finished) {
                runOnJS(triggerBack)();
              }
            }
          );
        },
      }),
      [translateX, triggerBack]
    );

    const panGesture = Gesture.Pan()
      .enabled(enabled)
      .activeOffsetX(15)
      .failOffsetY([-15, 15])
      .onStart((event) => {
        startX.value = event.x;
        if (event.x <= EDGE_WIDTH) {
          isGestureActive.value = true;
          runOnJS(triggerGestureStart)();
        }
      })
      .onUpdate((event) => {
        if (isGestureActive.value) {
          const newTranslateX = Math.max(0, event.translationX);
          translateX.value = newTranslateX;
        }
      })
      .onEnd((event) => {
        if (!isGestureActive.value) {
          return;
        }
        // 判断是否返回：距离超过阈值 或 速度超过阈值（快速甩动）
        const willGoBack = translateX.value > THRESHOLD || event.velocityX > VELOCITY_THRESHOLD;
        runOnJS(triggerGestureEnd)(willGoBack);
        if (willGoBack) {
          translateX.value = withTiming(
            SCREEN_WIDTH,
            ANIMATION_CONFIG,
            (finished) => {
              if (finished) {
                runOnJS(triggerBack)();
              }
            }
          );
        } else {
          translateX.value = withSpring(0, SPRING_CONFIG);
        }
        isGestureActive.value = false;
      })
      .onFinalize(() => {
        if (isGestureActive.value) {
          isGestureActive.value = false;
          translateX.value = withSpring(0, SPRING_CONFIG);
        }
      });

    const currentPageStyle = useAnimatedStyle(() => {
      return {
        transform: [{ translateX: translateX.value }],
      };
    });

    const previousPageStyle = useAnimatedStyle(() => {
      const prevTranslateX = interpolate(
        translateX.value,
        [0, SCREEN_WIDTH],
        [-SCREEN_WIDTH * 0.3, 0],
        Extrapolation.CLAMP
      );
      return { transform: [{ translateX: prevTranslateX }] };
    });

    const overlayStyle = useAnimatedStyle(() => {
      const overlayOpacity = interpolate(
        translateX.value,
        [0, SCREEN_WIDTH],
        [0.4, 0],
        Extrapolation.CLAMP
      );
      return { opacity: overlayOpacity };
    });

    return (
      <View style={styles.container}>
        {previousPage ? (
          <Animated.View style={[styles.previousPageContainer, previousPageStyle]}>
            {previousPage}
            <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="none" />
          </Animated.View>
        ) : null}
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.currentPageContainer, { backgroundColor }, currentPageStyle]}>
            {children}
          </Animated.View>
        </GestureDetector>
      </View>
    );
  }
);

SwipeBackContainer.displayName = 'SwipeBackContainer';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  previousPageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  currentPageContainer: {
    flex: 1,
    zIndex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
});

export default SwipeBackContainer;
