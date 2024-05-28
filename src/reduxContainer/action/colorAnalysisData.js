export const add_color_analysis =(userId, rgb, mood, symbol)=>{
    return {
        type:"add_color_analysis",
        User_id:userId,
        average_color:rgb,
        mood_image:mood,
        mood_symbol:symbol
    }
}
export const select_image_url =(url)=>{
    return {
        type :"select_image_url",
        imageUrl:url
    }
}

// export const adjust_opacity(opacity){
//     return {
//         type
//     }
// }