export const add_color_analysis =(userId, rgb, mood, symbol)=>{
    return {
        type:"add_color_analysis",
        User_id:userId,
        average_color:rgb,
        mood_image:mood,
        mood_symbol:symbol
    }
}