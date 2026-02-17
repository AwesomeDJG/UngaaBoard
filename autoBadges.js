/* autoBadges.js
  Handles logic to calculate stats and award badges.
  Depends on window.client being set in index.html
*/

window.checkAndAwardBadges = async function(userId, triggerType) {
  const client = window.client;
  if (!client) {
    console.error("AutoBadges: Supabase client (window.client) not found.");
    return;
  }
  
  console.log(`Checking badges for User ${userId} (Trigger: ${triggerType})...`);

  // 1. DEFINE BADGES
  // We check these definitions against user stats.
  const BADGE_DEFINITIONS = [
    {
      id: 'uptoe_10',
      label: '10 Uptoes',
      color: '#f1c40f', // Gold/Yellow
      condition: (stats) => stats.totalUptoes >= 10
    },
    {
      id: 'uptoe_50',
      label: '50 Uptoes',
      color: '#e67e22', // Orange
      condition: (stats) => stats.totalUptoes >= 50
    },
    {
      id: 'uptoe_100',
      label: '100 Uptoes',
      color: '#e74c3c', // Red
      condition: (stats) => stats.totalUptoes >= 100
    },
    {
      id: 'follower_5',
      label: '5 Followers',
      color: '#3498db', // Blue
      condition: (stats) => stats.followerCount >= 5
    },
    {
      id: 'follower_20',
      label: '20 Followers',
      color: '#9b59b6', // Purple
      condition: (stats) => stats.followerCount >= 20
    }
  ];

  try {
    // 2. FETCH STATS
    // We need to calculate total uptoes and follower count.
    
    // A. Get all posts by user to sum uptoes
    const { data: posts, error: postError } = await client
      .from('messages')
      .select('uptoes')
      .eq('user_id', userId);

    if (postError) throw postError;

    let totalUptoes = 0;
    if (posts) {
      posts.forEach(p => {
        totalUptoes += (Number(p.uptoes) || 0);
      });
    }

    // B. Get follower count
    const { count: followerCount, error: followError } = await client
      .from('follows')
      .select('*', { count: 'exact', head: true }) // efficient count query
      .eq('following_id', userId);

    if (followError) throw followError;

    const stats = { totalUptoes, followerCount };
    console.log("User Stats:", stats);

    // 3. FETCH EXISTING BADGES
    const { data: existingBadges, error: badgeError } = await client
      .from('user_badges')
      .select('*');
      
    if (badgeError) throw badgeError;

    // 4. CHECK & AWARD
    // We loop through definitions. If user meets condition AND doesn't have it, we award it.
    
    for (const def of BADGE_DEFINITIONS) {
      if (def.condition(stats)) {
        
        // Check if DB already has this badge row
        // Note: In your system, it looks like 'user_badges' table has specific rows for specific badges?
        // Or is it one row per badge definition with a 'holders' array? 
        // Based on previous code, it uses a 'holders' JSON/Array column.
        
        let dbBadge = existingBadges.find(b => b.label === def.label);
        
        if (!dbBadge) {
          // Badge doesn't exist in DB at all, create it
          const { data: newBadge, error: createErr } = await client
            .from('user_badges')
            .insert([{
              label: def.label,
              color: def.color,
              holders: [userId], // Initialize with this user
              image_url: null
            }])
            .select()
            .single();
            
          if (createErr) console.error("Error creating badge:", createErr);
          else console.log(`Created new badge '${def.label}' and awarded to user.`);
          
        } else {
          // Badge exists, check if user is in 'holders'
          let holders = dbBadge.holders;
          
          // Handle cases where holders might be a string (legacy/error) or array
          if (typeof holders === 'string') {
            try { holders = JSON.parse(holders); } catch(e) { holders = []; }
          }
          if (!Array.isArray(holders)) holders = [];

          if (!holders.includes(userId)) {
            // AWARD THE BADGE
            holders.push(userId);
            
            const { error: updateErr } = await client
              .from('user_badges')
              .update({ holders: holders })
              .eq('id', dbBadge.id);

            if (updateErr) console.error("Error updating badge holders:", updateErr);
            else console.log(`Awarded badge '${def.label}' to user!`);
          }
        }
      }
    }

  } catch (err) {
    console.error("AutoBadges Error:", err);
  }
};