import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from './firebase';
import { Box, VStack, Heading, Input, Button, Text } from '@chakra-ui/react';

function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await createUserWithEmailAndPassword(auth, email, password);
            console.log('Registration Successful');
        } catch (error) {
            setError(error.Message);
        }

        setLoading(false);
    }

return (
    <Box bg="white" p={8} rounded="lg" shadow="md" w="full" maxW="sm">
      <VStack spacing={4}>
        <Heading size="md" color="gray.700">Register</Heading>
        <form onSubmit={handleSubmit} style={{width: '100%'}}>
          <VStack spacing={4} w="full">
            <Box w="full">
              <Text mb={2} fontSize="sm" fontWeight="medium">Email</Text>
              <Input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </Box>
            
            <Box w="full">
              <Text mb={2} fontSize="sm" fontWeight="medium">Password</Text>
              <Input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </Box>
            
            <Button 
              type="submit" 
              colorScheme="blue" 
              w="full"
              loading={loading}
            >
              {loading ? 'Registering...' : 'Register'}
            </Button>
            
            {error && <Text color="red.500" fontSize="sm">{error}</Text>}
          </VStack>
        </form>
      </VStack>
    </Box>
  );
}

export default Register;