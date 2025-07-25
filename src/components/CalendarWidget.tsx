import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  IconButton,
  Grid,
  Button,
  Chip
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';

const CalendarWidget: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const today = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Primeiro dia do mês
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  
  // Dia da semana do primeiro dia (0 = domingo)
  const firstDayWeekday = firstDayOfMonth.getDay();
  
  // Número de dias no mês
  const daysInMonth = lastDayOfMonth.getDate();

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(currentMonth - 1);
    } else {
      newDate.setMonth(currentMonth + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (day: number) => {
    return today.getDate() === day && 
           today.getMonth() === currentMonth && 
           today.getFullYear() === currentYear;
  };

  const isThursday = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    return date.getDay() === 4; // 4 = quinta-feira
  };

  // Criar array de dias para renderizar
  const calendarDays = [];
  
  // Adicionar espaços vazios para os dias antes do primeiro dia do mês
  for (let i = 0; i < firstDayWeekday; i++) {
    calendarDays.push(null);
  }
  
  // Adicionar todos os dias do mês
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  return (
    <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <CalendarIcon color="primary" />
          <Typography variant="h6">Calendário</Typography>
        </Box>
        <Button size="small" onClick={goToToday} variant="outlined">
          Hoje
        </Button>
      </Box>

      {/* Header do calendário */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <IconButton onClick={() => navigateMonth('prev')} size="small">
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="h6" textAlign="center">
          {monthNames[currentMonth]} {currentYear}
        </Typography>
        <IconButton onClick={() => navigateMonth('next')} size="small">
          <ChevronRightIcon />
        </IconButton>
      </Box>

      {/* Dias da semana */}
      <Box 
        sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          gap: 0.5,
          mb: 1,
          minHeight: 32
        }}
      >
        {dayNames.map((dayName) => (
          <Box key={dayName} sx={{ 
            textAlign: 'center', 
            py: 0.5,
            minWidth: 0, // Permite que o conteúdo seja comprimido
            overflow: 'hidden'
          }}>
            <Typography 
              variant="caption" 
              fontWeight="bold" 
              color="text.secondary"
              sx={{ 
                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                whiteSpace: 'nowrap'
              }}
            >
              {dayName}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Dias do mês */}
      <Box 
        sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          gap: 0.5,
          minHeight: 200,
          aspectRatio: { xs: '7/6', sm: '7/5' } // Mantém proporção consistente
        }}
      >
        {calendarDays.map((day, index) => (
          <Box 
            key={index} 
            sx={{ 
              textAlign: 'center', 
              minHeight: { xs: 28, sm: 32 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 0, // Permite compressão
              overflow: 'hidden'
            }}
          >
            {day && (
              <Box
                sx={{
                  width: '100%',
                  maxWidth: { xs: 28, sm: 32 },
                  height: { xs: 28, sm: 32 },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 1,
                  backgroundColor: isToday(day) ? 'primary.main' : 'transparent',
                  color: isToday(day) ? 'white' : 'text.primary',
                  position: 'relative',
                  cursor: 'pointer',
                  flexShrink: 0, // Evita que o elemento seja comprimido
                  '&:hover': {
                    backgroundColor: isToday(day) ? 'primary.dark' : 'action.hover'
                  }
                }}
              >
                <Typography 
                  variant="body2" 
                  fontWeight={isToday(day) ? 'bold' : 'normal'}
                  sx={{ 
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    lineHeight: 1
                  }}
                >
                  {day}
                </Typography>
                {isThursday(day) && (
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: { xs: 1, sm: 2 },
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: { xs: 3, sm: 4 },
                      height: { xs: 3, sm: 4 },
                      borderRadius: '50%',
                      backgroundColor: isToday(day) ? 'white' : 'primary.main'
                    }}
                  />
                )}
              </Box>
            )}
          </Box>
        ))}
      </Box>

      {/* Legenda */}
      <Box mt={2} pt={2} borderTop={1} borderColor="divider">
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: 'primary.main'
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Quintas-feiras (dia de receitas)
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          O médico geralmente faz as receitas às quintas-feiras
        </Typography>
      </Box>
    </Paper>
  );
};

export default CalendarWidget;

