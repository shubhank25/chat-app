// Test camera access
async function testCamera() {
  try {
    console.log('Testing camera access...');
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: true, 
      audio: true 
    });
    
    console.log('Camera access successful!');
    console.log('Video tracks:', stream.getVideoTracks());
    console.log('Audio tracks:', stream.getAudioTracks());
    
    // Stop the stream
    stream.getTracks().forEach(track => track.stop());
    
    return true;
  } catch (error) {
    console.error('Camera access failed:', error);
    return false;
  }
}

// Run test
testCamera();