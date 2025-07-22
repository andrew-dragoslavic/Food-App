import React, { useState, useEffect } from 'react';
import Login from './Login';
import { Box, Heading, Text, Button, VStack, Separator, Spinner, Center } from '@chakra-ui/react';
import Register from './Register';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
          
          <Box w="full" p={4} bg="white" rounded="lg" shadow="md">
              <VStack spacing={4}>
                <Heading size="md">Voice Commands</Heading>
                <Button colorScheme="green" size="lg">
                  🎤 Record Command
                </Button>
                <Text color="gray.600">Click the button and say your food order</Text>
              </VStack>
          </Box>
          
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