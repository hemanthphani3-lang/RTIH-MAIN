"use server";

import { supabaseAdmin } from "@/lib/supabase/server";

// ========================================================
// HACKATHON CONFIGURATION (MANAGER / ADMIN)
// ========================================================

export async function createHackathon(
  opportunityId: string,
  config: {
    maxTeamSize: number;
    minTeamSize: number;
    submissionDeadline: string;
    judgingCriteria: any;
    rules: string;
  }
) {
  try {
    const { data, error } = await supabaseAdmin
      .from("hackathons")
      .upsert({
        opportunity_id: opportunityId,
        max_team_size: config.maxTeamSize,
        min_team_size: config.minTeamSize,
        submission_deadline: config.submissionDeadline,
        judging_criteria: config.judgingCriteria,
        rules: config.rules,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function addProblemStatement(
  hackathonId: string,
  ps: { title: string; description: string; domainId?: string; sponsorName?: string }
) {
  try {
    const { data, error } = await supabaseAdmin
      .from("hackathon_problem_statements")
      .insert({
        hackathon_id: hackathonId,
        title: ps.title,
        description: ps.description,
        domain_id: ps.domainId || null,
        sponsor_name: ps.sponsorName || null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ========================================================
// TEAM MANAGEMENT (ORGANIZATION)
// ========================================================

export async function getTeamForOrganization(hackathonId: string, organizationId: string) {
  try {
    const { data: team, error } = await supabaseAdmin
      .from("hackathon_teams")
      .select("*, hackathon_team_members(*), hackathon_submissions(*)")
      .eq("hackathon_id", hackathonId)
      .eq("organization_id", organizationId)
      .single();

    if (error && error.code !== "PGRST116") throw new Error(error.message);
    return { success: true, data: team || null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createTeam(hackathonId: string, organizationId: string, teamName: string) {
  try {
    // Ensure hackathon config exists for this opportunity (for older hackathons)
    const { error: hackathonCheckError } = await supabaseAdmin
      .from("hackathons")
      .select("opportunity_id")
      .eq("opportunity_id", hackathonId)
      .single();

    if (hackathonCheckError && hackathonCheckError.code === "PGRST116") {
      await supabaseAdmin.from("hackathons").insert({
        opportunity_id: hackathonId,
        min_team_size: 1,
        max_team_size: 10,
        submission_deadline: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
        rules: "Standard hackathon rules apply.",
      });
    }

    const { data, error } = await supabaseAdmin
      .from("hackathon_teams")
      .insert({
        hackathon_id: hackathonId,
        organization_id: organizationId,
        name: teamName,
        status: "Registered",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    
    // Create an audit timeline event
    await supabaseAdmin.from("opportunity_timeline").insert({
      opportunity_id: hackathonId,
      organization_id: organizationId,
      event: "Team Created",
      description: `Team '${teamName}' was registered for the hackathon.`,
    });

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function addTeamMember(teamId: string, name: string, email: string, role: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from("hackathon_team_members")
      .insert({
        team_id: teamId,
        member_name: name,
        member_email: email,
        role,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ========================================================
// SUBMISSIONS (ORGANIZATION)
// ========================================================

export async function submitHackathonProject(
  teamId: string,
  problemStatementId: string,
  payload: {
    title: string;
    description: string;
    githubUrl?: string;
    demoUrl?: string;
    pitchDeckUrl?: string;
    videoUrl?: string;
  }
) {
  try {
    const { data, error } = await supabaseAdmin
      .from("hackathon_submissions")
      .upsert({
        team_id: teamId,
        problem_statement_id: problemStatementId,
        title: payload.title,
        description: payload.description,
        github_url: payload.githubUrl,
        demo_url: payload.demoUrl,
        pitch_deck_url: payload.pitchDeckUrl,
        video_url: payload.videoUrl,
        status: "Submitted",
        submitted_at: new Date().toISOString(),
      }, { onConflict: "team_id" })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ========================================================
// JUDGES & EVALUATIONS (JUDGE VIEW VIA MAGIC LINK)
// ========================================================

export async function getJudgeDataByToken(magicToken: string) {
  try {
    // Get the judge by token
    const { data: judge, error } = await supabaseAdmin
      .from("hackathon_judges")
      .select("*, hackathons(opportunity_id, opportunities(title))")
      .eq("magic_token", magicToken)
      .single();

    if (error) throw new Error("Invalid or expired judge token.");

    // Get assigned submissions
    const { data: assignments, error: assignmentsError } = await supabaseAdmin
      .from("hackathon_judge_assignments")
      .select(`
        id, status,
        hackathon_submissions (
          id, title, description, github_url, demo_url, pitch_deck_url, video_url,
          hackathon_teams(name),
          hackathon_problem_statements(title)
        )
      `)
      .eq("judge_id", judge.id);

    if (assignmentsError) throw new Error(assignmentsError.message);

    // Get problem statements for the hackathon
    const { data: problemStatements } = await supabaseAdmin
      .from("hackathon_problem_statements")
      .select("id, title, description, sponsor_name")
      .eq("hackathon_id", judge.hackathon_id);

    // Get all teams and their submissions to see who is working on what
    const { data: allSubmissions } = await supabaseAdmin
      .from("hackathon_submissions")
      .select("id, title, problem_statement_id, hackathon_teams!inner(name, hackathon_id)")
      .eq("hackathon_teams.hackathon_id", judge.hackathon_id);

    // Get all registered teams
    const { count: totalTeams } = await supabaseAdmin
      .from("hackathon_teams")
      .select("id", { count: "exact", head: true })
      .eq("hackathon_id", judge.hackathon_id);

    return { 
      success: true, 
      judge, 
      assignments: assignments || [], 
      problemStatements: problemStatements || [],
      overview: {
        totalTeams: totalTeams || 0,
        submissions: allSubmissions || []
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function submitEvaluation(
  judgeId: string,
  submissionId: string,
  scores: { innovation: number; feasibility: number; impact: number; market: number; presentation: number },
  comments: string
) {
  try {
    const { data, error } = await supabaseAdmin
      .from("hackathon_evaluations")
      .upsert({
        submission_id: submissionId,
        judge_id: judgeId,
        innovation_score: scores.innovation,
        feasibility_score: scores.feasibility,
        impact_score: scores.impact,
        market_potential_score: scores.market,
        presentation_score: scores.presentation,
        comments: comments,
      }, { onConflict: "submission_id,judge_id" })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Mark assignment as evaluated
    await supabaseAdmin
      .from("hackathon_judge_assignments")
      .update({ status: "Evaluated" })
      .eq("judge_id", judgeId)
      .eq("submission_id", submissionId);

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ========================================================
// LEADERBOARD & RESULTS (MANAGER / ADMIN)
// ========================================================

export async function getHackathonLeaderboard(hackathonId: string) {
  try {
    // This aggregates scores. In a real system, you might run a SQL function or view.
    // For now, we fetch all submissions and their evaluations.
    const { data: submissions, error } = await supabaseAdmin
      .from("hackathon_submissions")
      .select(`
        id, title, status,
        hackathon_teams(name, organization_id, organizations(name)),
        hackathon_evaluations(total_score)
      `)
      .eq("hackathon_teams.hackathon_id", hackathonId)
      .not("hackathon_teams", "is", null);

    if (error) throw new Error(error.message);

    const leaderboard = submissions.map((sub: any) => {
      const evaluations = sub.hackathon_evaluations || [];
      const totalPoints = evaluations.reduce((sum: number, ev: any) => sum + (ev.total_score || 0), 0);
      const avgScore = evaluations.length > 0 ? (totalPoints / evaluations.length).toFixed(2) : 0;
      
      return {
        submissionId: sub.id,
        title: sub.title,
        teamName: sub.hackathon_teams?.name,
        orgName: sub.hackathon_teams?.organizations?.name,
        evaluationsCount: evaluations.length,
        averageScore: Number(avgScore)
      };
    });

    // Sort descending by score
    leaderboard.sort((a, b) => b.averageScore - a.averageScore);

    return { success: true, leaderboard };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
