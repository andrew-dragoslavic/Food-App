import React, { useState, useEffect } from 'react';
import Login from './Login';
import { Box, Heading, Text, Button, VStack, Separator, Spinner, Center } from '@chakra-ui/react';
import Register from './Register';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [voiceError, setVoiceError] = useState('');
  const [transcript, setTranscript] = useState('');
  const [parsedOrder, setParsedOrder] = useState(null);

  useEffect(() => {
    const change = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => change();
  }, [])

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
    setTranscript('');
    setParsedOrder(null);
    setVoiceError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      const audioChunks = [];
      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      recorder.onstop = () => {
        const newAudioBlob = new Blob(audioChunks, { type: "audio/wav" });
        setAudioBlob(newAudioBlob);
        processAudio(newAudioBlob);
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      setVoiceError('Could not access microphone. Please check permissions.');
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
    formData.append('audio', audioBlob);

    try {
      const response = await fetch('/api/speech/transcribe', {
        method: "POST",
        body: formData
      });

      const result = await response.json()
      setTranscript(result.text);
      setParsedOrder(result.order);
    } catch (error) {
      setVoiceError("Speech processing failed");
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
      <VStack spacing={6} maxW="md" mx="auto">
        <Heading color="blue.600" size="lg">Voice Food Ordering</Heading>
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
              <Text color="gray.600">Click the button and say your food order</Text>
              
                {transcript && (
                  <Box p={3} bg="gray.100" rounded="md" w="full">
                    <Text fontWeight="bold" fontSize="sm" color="gray.600">You said:</Text>
                    <Text>{transcript}</Text>
                  </Box>
                )}
                
                {/* --- UPDATED DISPLAY LOGIC --- */}
                {parsedOrder && parsedOrder.restaurant && (
                  <Box p={4} bg="blue.50" rounded="md" w="full">
                    <VStack align="start" spacing={3}>
                      <Heading size="sm" color="blue.700">Order Details</Heading>
                      <Text>
                        <Text as="span" fontWeight="bold">Restaurant:</Text> {parsedOrder.restaurant}
                      </Text>
                      <VStack align="start" spacing={2} w="full">
                        <Text fontWeight="bold">Items:</Text>
                        {parsedOrder.items && parsedOrder.items.length > 0 ? (
                          parsedOrder.items.map((orderItem, index) => (
                            <Box key={index} pl={3} pt={2} pb={2} bg="white" rounded="md" w="full" shadow="sm">
                              <Text>
                                <Text as="span" fontWeight="600">{orderItem.quantity}x</Text> {orderItem.item}
                              </Text>
                            </Box>
                          ))
                        ) : (
                          <Text fontSize="sm" color="gray.600">No items were parsed from your order.</Text>
                        )}
                      </VStack>
                    </VStack>
                  </Box>
                )}

                {voiceError && (
                  <Text color="red.500" fontSize="sm">{voiceError}</Text>
                )}
              </VStack>
          </Box>
          
        <Button colorScheme="gray" onClick={handleLogout}>
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
