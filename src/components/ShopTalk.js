import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, TextField, Button, Avatar, 
  Divider, List, ListItem, ListItemAvatar, ListItemText,
  Chip, IconButton, Tooltip, Card
} from '@mui/material';
import { 
  Send as SendIcon, 
  Chat as ChatIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Event as EventIcon
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import { formatDistanceToNow } from 'date-fns';

const ShopTalk = () => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [category, setCategory] = useState('General');

    useEffect(() => {
        const fetchMessages = async () => {
            const { data } = await supabase
                .from('shop_talk')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);
            if (data) setMessages(data);
        };
        fetchMessages();

        // Subscribe to real-time updates
        const subscription = supabase
            .channel('shop_talk_changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'shop_talk' }, (payload) => {
                setMessages(prev => [payload.new, ...prev]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const sendMessage = async () => {
        if (!newMessage.trim()) return;
        const msg = {
            content: newMessage,
            category: category,
            author: 'DostAuto Terminal', // This would ideally be the logged-in user
            created_at: new Date().toISOString()
        };
        await supabase.from('shop_talk').insert([msg]);
        setNewMessage('');
    };

    const getIcon = (cat) => {
        switch(cat) {
            case 'Urgent': return <WarningIcon sx={{ color: 'error.main' }} />;
            case 'Inventory': return <EventIcon sx={{ color: 'primary.main' }} />;
            default: return <InfoIcon sx={{ color: 'text.secondary' }} />;
        }
    };

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', p: 1 }}>
            <Box sx={{ mb: 6 }}>
                <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main', mb: 0.5 }}>Shop Talk</Typography>
                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>Internal I/O log and operational communication channel</Typography>
            </Box>

            <Paper sx={{ p: 4, borderRadius: 4, mb: 4, bgcolor: '#fff', border: '1.5px solid rgba(0,0,0,0.05)' }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    {['General', 'Urgent', 'Inventory', 'Customer'].map(cat => (
                        <Chip 
                            key={cat} 
                            label={cat} 
                            onClick={() => setCategory(cat)}
                            variant={category === cat ? "filled" : "outlined"}
                            color={category === cat ? "primary" : "default"}
                            sx={{ fontWeight: 800, borderRadius: 3, px: 1 }}
                        />
                    ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField 
                        fullWidth 
                        placeholder="Type operational update or note..." 
                        value={newMessage} 
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        InputProps={{ sx: { borderRadius: 4, bgcolor: 'rgba(0,0,0,0.02)' } }}
                    />
                    <Button 
                        variant="contained" 
                        onClick={sendMessage}
                        sx={{ borderRadius: 4, px: 4, fontWeight: 900 }}
                        endIcon={<SendIcon />}
                    >
                        TRANSmit
                    </Button>
                </Box>
            </Paper>

            <Card sx={{ borderRadius: 4, overflow: 'hidden' }}>
                <List sx={{ p: 0 }}>
                    {messages.map((msg, idx) => (
                        <React.Fragment key={msg.id}>
                            <ListItem sx={{ p: 3, '&:hover': { bgcolor: 'rgba(0,0,0,0.01)' } }}>
                                <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: 'secondary.light', color: 'secondary.main', borderRadius: 3, fontWeight: 800 }}>
                                        {msg.author[0]}
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText 
                                    primary={
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography sx={{ fontWeight: 800, fontSize: '1.1rem' }}>{msg.content}</Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                                            </Typography>
                                        </Box>
                                    }
                                    secondary={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                            {getIcon(msg.category)}
                                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                                                {msg.category.toUpperCase()} • {msg.author}
                                            </Typography>
                                        </Box>
                                    }
                                />
                            </ListItem>
                            {idx < messages.length - 1 && <Divider sx={{ opacity: 0.5 }} />}
                        </React.Fragment>
                    ))}
                    {messages.length === 0 && (
                        <Box sx={{ p: 8, textAlign: 'center' }}>
                            <ChatIcon sx={{ fontSize: 64, color: 'rgba(0,0,0,0.05)', mb: 2 }} />
                            <Typography color="text.secondary" sx={{ fontWeight: 600 }}>Channel silent. Awaiting operational data.</Typography>
                        </Box>
                    )}
                </List>
            </Card>
        </Box>
    );
};

export default ShopTalk;
