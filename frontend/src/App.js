import React, { useState, useEffect } from "react";
import Login from "./Login";
import {
  Box,
  Heading,
  Text,
  Button,
  VStack,
  Separator,
  Spinner,
  Center,
  Alert,
  HStack,
  Badge,
} from "@chakra-ui/react";
import Register from "./Register";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [voiceError, setVoiceError] = useState("");
  const [transcript, setTranscript] = useState("");
  const [parsedOrder, setParsedOrder] = useState(null);
  const [menuResolution, setMenuResolution] = useState(null);
  const [clarificationChoices, setClarificationChoices] = useState({});
  const [sessionId, setSessionId] = useState(null);
  const [needsClarification, setNeedsClarification] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderResult, setOrderResult] = useState(null);

  useEffect(() => {
    const change = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => change();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("Logged out successfully!");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const startRecording = async () => {
    // Clear previous results for a better user experience
    setTranscript("");
    setVoiceError("");

    if (!needsClarification) {
      setParsedOrder(null);
      setMenuResolution(null);
      setClarificationChoices({});
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      const audioChunks = [];
      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      recorder.onstop = () => {
        const newAudioBlob = new Blob(audioChunks, { type: "audio/webm;codecs=opus" });
        setAudioBlob(newAudioBlob);
        processAudio(newAudioBlob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      setVoiceError("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob) => {
    const formData = new FormData();
    formData.append("audio", audioBlob);

    // Include session ID if we have one (for clarification requests)
    if (sessionId) {
      formData.append("sessionId", sessionId);
    }

    try {
      const response = await fetch("/api/speech/transcribe", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      setTranscript(result.text);

      // Handle session management
      if (result.sessionId) {
        setSessionId(result.sessionId);
        setNeedsClarification(result.needsClarification);
      } else {
        setSessionId(null);
        setNeedsClarification(false);
      }

      // Update the UI
      setParsedOrder(result.order);
      if (result.prediction) {
        setMenuResolution(result.prediction);
      }
    } catch (error) {
      setVoiceError("Speech processing failed");
    }
  };

  const handleClarificationChoice = (itemIndex, value) => {
    setClarificationChoices((prev) => ({
      ...prev,
      [itemIndex]: value,
    }));
  };

  const handleProceedWithOrder = async () => {
    if (!menuResolution?.confident_matches || menuResolution.confident_matches.length === 0) {
      setVoiceError("No confirmed items to order");
      return;
    }

    setIsPlacingOrder(true);
    setVoiceError("");
    setOrderResult(null);

    try {
      const response = await fetch("/api/speech/place-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirmedItems: menuResolution.confident_matches,
          restaurant: parsedOrder?.restaurant
        }),
      });

      const result = await response.json();
      setOrderResult(result);

      if (result.success) {
        // Clear the order after successful placement
        setParsedOrder(null);
        setMenuResolution(null);
        setTranscript("");
        setSessionId(null);
        setNeedsClarification(false);
      }
    } catch (error) {
      setVoiceError("Failed to place order. Please try again.");
      console.error("Order placement error:", error);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <Center minH="100vh" bg="gray.50">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text>Loading...</Text>
        </VStack>
      </Center>
    );
  }

  if (user) {
    return (
      <Box bg="gray.50" minH="100vh" p={8}>
        <VStack spacing={6} maxW="2xl" mx="auto">
          <Heading color="blue.600" size="lg">
            Voice Food Ordering
          </Heading>
          <Text fontSize="lg">Welcome, {user.email}!</Text>

          <Box w="full" p={6} bg="white" rounded="lg" shadow="md">
            <VStack spacing={4}>
              <Heading size="md">Voice Commands</Heading>
              <Button
                colorScheme={isRecording ? "red" : "green"}
                size="lg"
                onClick={isRecording ? stopRecording : startRecording}
              >
                {isRecording ? "🔴 Stop Recording" : "🎤 Record Command"}
              </Button>
              <Text color="gray.600">
                Click the button and say your food order
              </Text>

              {transcript && (
                <Box p={3} bg="gray.100" rounded="md" w="full">
                  <Text fontWeight="bold" fontSize="sm" color="gray.600">
                    You said:
                  </Text>
                  <Text>{transcript}</Text>
                </Box>
              )}

              {/* Original Parsed Order Display */}
              {parsedOrder && parsedOrder.restaurant && (
                <Box p={4} bg="blue.50" rounded="md" w="full">
                  <VStack align="start" spacing={3}>
                    <Heading size="sm" color="blue.700">
                      Order Details
                    </Heading>
                    <Text>
                      <Text as="span" fontWeight="bold">
                        Restaurant:
                      </Text>{" "}
                      {parsedOrder.restaurant}
                    </Text>
                    <VStack align="start" spacing={2} w="full">
                      <Text fontWeight="bold">Items:</Text>
                      {parsedOrder.items && parsedOrder.items.length > 0 ? (
                        parsedOrder.items.map((orderItem, index) => (
                          <Box
                            key={index}
                            pl={3}
                            pt={2}
                            pb={2}
                            bg="white"
                            rounded="md"
                            w="full"
                            shadow="sm"
                          >
                            <Text>
                              <Text as="span" fontWeight="600">
                                {orderItem.quantity}x
                              </Text>{" "}
                              {orderItem.item}
                            </Text>
                          </Box>
                        ))
                      ) : (
                        <Text fontSize="sm" color="gray.600">
                          No items were parsed from your order.
                        </Text>
                      )}
                    </VStack>
                  </VStack>
                </Box>
              )}

              {voiceError && (
                <Text color="red.500" fontSize="sm">
                  {voiceError}
                </Text>
              )}
            </VStack>
          </Box>

          {/* Menu Resolution Section - Separate Box */}
          {menuResolution && (
            <Box w="full" p={6} bg="white" rounded="lg" shadow="md">
              <VStack spacing={4} align="stretch">
                <Heading size="md">Menu Matches</Heading>

                {/* Confirmed Matches Section */}
                {menuResolution.confident_matches &&
                  menuResolution.confident_matches.length > 0 && (
                    <Box
                      p={4}
                      bg="green.50"
                      rounded="md"
                      borderWidth="1px"
                      borderColor="green.200"
                    >
                      <VStack align="start" spacing={3}>
                        <HStack>
                          <Text fontWeight="bold" color="green.700">
                            ✓ Confirmed Items
                          </Text>
                        </HStack>
                        {menuResolution.confident_matches.map(
                          (match, index) => (
                            <Box
                              key={index}
                              p={3}
                              bg="white"
                              rounded="md"
                              w="full"
                              shadow="sm"
                            >
                              <HStack justify="space-between">
                                <Text>
                                  <Text as="span" fontWeight="600">
                                    {match.quantity}x
                                  </Text>{" "}
                                  {match.matched_menu_item}
                                </Text>
                                <Badge colorScheme="green">{match.price}</Badge>
                              </HStack>
                            </Box>
                          )
                        )}
                      </VStack>
                    </Box>
                  )}

                {/* Clarification Needed Section */}
                {menuResolution.clarification_needed &&
                  menuResolution.clarification_needed.length > 0 && (
                    <Box
                      p={4}
                      bg="yellow.50"
                      rounded="md"
                      borderWidth="1px"
                      borderColor="yellow.200"
                    >
                      <VStack align="start" spacing={4}>
                        <HStack>
                          <Text fontWeight="bold" color="yellow.700">
                            ⚠ Need Clarification
                          </Text>
                        </HStack>
                        {menuResolution.clarification_needed.map(
                          (item, index) => (
                            <Box
                              key={index}
                              p={4}
                              bg="white"
                              rounded="md"
                              w="full"
                              shadow="sm"
                            >
                              <VStack align="start" spacing={3}>
                                <Text fontWeight="semibold">
                                  {item.clarification_question}
                                </Text>
                                <Text fontSize="sm" color="gray.600">
                                  You requested: {item.quantity}x{" "}
                                  {item.requested_item}
                                </Text>
                                <Separator />
                                <VStack align="start" spacing={2}>
                                  <Text
                                    fontSize="sm"
                                    fontWeight="medium"
                                    color="gray.700"
                                  >
                                    Possible options:
                                  </Text>
                                  {item.possible_matches.map(
                                    (match, matchIndex) => (
                                      <Box
                                        key={matchIndex}
                                        p={2}
                                        bg="gray.50"
                                        rounded="md"
                                        w="full"
                                      >
                                        <HStack justify="space-between">
                                          <Text>{match.menu_item}</Text>
                                          <Badge colorScheme="gray">
                                            {match.price}
                                          </Badge>
                                        </HStack>
                                      </Box>
                                    )
                                  )}
                                  <Text fontSize="sm" color="blue.600" mt={2}>
                                    💬 Say which option you'd like to clarify
                                    your choice
                                  </Text>
                                </VStack>
                              </VStack>
                            </Box>
                          )
                        )}
                      </VStack>
                    </Box>
                  )}

                {/* Not Found Section */}
                {menuResolution.not_found &&
                  menuResolution.not_found.length > 0 && (
                    <Alert.Root status="warning">
                      <Alert.Indicator />
                      <Alert.Content>
                        <Alert.Title>Items Not Found</Alert.Title>
                        <Alert.Description>
                          <VStack align="start" spacing={1} mt={2}>
                            {menuResolution.not_found.map((item, index) => (
                              <Text key={index}>
                                • {item.quantity}x {item.requested_item}
                              </Text>
                            ))}
                          </VStack>
                        </Alert.Description>
                      </Alert.Content>
                    </Alert.Root>
                  )}

                {/* Proceed with Order Button */}
                {menuResolution.confident_matches &&
                  menuResolution.confident_matches.length > 0 && (
                    <>
                      <Button 
                        colorScheme="blue" 
                        size="lg" 
                        w="full"
                        onClick={handleProceedWithOrder}
                        isLoading={isPlacingOrder}
                        loadingText="Placing Order..."
                        isDisabled={isPlacingOrder}
                      >
                        Proceed with Order
                      </Button>

                      {/* Order Result Display */}
                      {orderResult && (
                        <Box
                          p={4}
                          bg={orderResult.success ? "green.50" : "red.50"}
                          rounded="md"
                          borderWidth="1px"
                          borderColor={orderResult.success ? "green.200" : "red.200"}
                          w="full"
                        >
                          <VStack align="start" spacing={3}>
                            <Text
                              fontWeight="bold"
                              color={orderResult.success ? "green.700" : "red.700"}
                            >
                              {orderResult.success ? "✅ Order Status" : "❌ Order Failed"}
                            </Text>
                            <Text>{orderResult.message}</Text>
                            
                            {orderResult.items && (
                              <VStack align="start" spacing={2} w="full">
                                <Text fontWeight="medium" fontSize="sm">Item Results:</Text>
                                {orderResult.items.map((item, index) => (
                                  <Box
                                    key={index}
                                    p={2}
                                    bg="white"
                                    rounded="md"
                                    w="full"
                                    borderLeftWidth="3px"
                                    borderLeftColor={item.added ? "green.400" : "red.400"}
                                  >
                                    <HStack justify="space-between">
                                      <Text fontSize="sm">
                                        {item.quantity}x {item.item}
                                      </Text>
                                      <Badge 
                                        colorScheme={item.added ? "green" : "red"}
                                        size="sm"
                                      >
                                        {item.status}
                                      </Badge>
                                    </HStack>
                                  </Box>
                                ))}
                              </VStack>
                            )}
                          </VStack>
                        </Box>
                      )}
                    </>
                  )}
              </VStack>
            </Box>
          )}

          {/* Logout Button */}
          <Button colorScheme="red" onClick={handleLogout}>
            Logout
          </Button>
        </VStack>
      </Box>
    );
  }

  return (
    <Box bg="gray.50" minH="100vh" p={8}>
      <VStack spacing={8} maxW="md" mx="auto">
        <Heading color="blue.600" textAlign="center">
          Voice Food Ordering
        </Heading>
        <Register />
        <Separator />
        <Login />
      </VStack>
    </Box>
  );
}

export default App;